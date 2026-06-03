"use client";

import { useEffect, useId, useRef, useState } from "react";

export type TurkeyAddressValue = {
  city: string;
  district: string;
  neighborhood: string;
  postalCode: string;
  line1: string;
};

type Props = {
  value: TurkeyAddressValue;
  onChange: (patch: Partial<TurkeyAddressValue>) => void;
  idPrefix?: string;
  disabled?: boolean;
};

type CityRow = { code: string; name: string };

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function TurkeyAddressFields({ value, onChange, idPrefix = "kn-addr", disabled = false }: Props) {
  const uid = useId();
  const prefix = idPrefix || uid.replace(/:/g, "");
  const [cities, setCities] = useState<CityRow[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);
  const postalReq = useRef(0);

  useEffect(() => {
    fetchJson<{ cities: CityRow[] }>("/api/address/tr/cities").then((j) => {
      if (j?.cities) setCities(j.cities);
    });
  }, []);

  useEffect(() => {
    if (!value.city) {
      setDistricts([]);
      setNeighborhoods([]);
      return;
    }
    let cancelled = false;
    setLoadingDistricts(true);
    fetchJson<{ districts: string[] }>(
      `/api/address/tr/districts?city=${encodeURIComponent(value.city)}`,
    ).then((j) => {
      if (cancelled) return;
      setDistricts(j?.districts ?? []);
      setLoadingDistricts(false);
    });
    return () => {
      cancelled = true;
    };
  }, [value.city]);

  useEffect(() => {
    if (!value.city || !value.district) {
      setNeighborhoods([]);
      return;
    }
    let cancelled = false;
    setLoadingNeighborhoods(true);
    fetchJson<{ neighborhoods: string[] }>(
      `/api/address/tr/neighborhoods?city=${encodeURIComponent(value.city)}&district=${encodeURIComponent(value.district)}`,
    ).then((j) => {
      if (cancelled) return;
      setNeighborhoods(j?.neighborhoods ?? []);
      setLoadingNeighborhoods(false);
    });
    return () => {
      cancelled = true;
    };
  }, [value.city, value.district]);

  useEffect(() => {
    if (!value.city || !value.district || !value.neighborhood) return;
    const reqId = ++postalReq.current;
    fetchJson<{ postalCode: string }>(
      `/api/address/tr/postal-code?city=${encodeURIComponent(value.city)}&district=${encodeURIComponent(value.district)}`,
    ).then((j) => {
      if (reqId !== postalReq.current) return;
      const code = j?.postalCode?.trim() ?? "";
      if (code) onChange({ postalCode: code });
    });
  }, [value.city, value.district, value.neighborhood, onChange]);

  function onCityChange(city: string) {
    onChange({
      city,
      district: "",
      neighborhood: "",
      postalCode: "",
    });
  }

  function onDistrictChange(district: string) {
    onChange({
      district,
      neighborhood: "",
      postalCode: "",
    });
  }

  return (
    <>
      <div className="form-group">
        <label htmlFor={`${prefix}-city`}>İl *</label>
        <select
          id={`${prefix}-city`}
          className="form-control kn-tr-address-select"
          required
          disabled={disabled}
          value={value.city}
          onChange={(e) => onCityChange(e.target.value)}
        >
          <option value="">İl seçin</option>
          {cities.map((c) => (
            <option key={c.code} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor={`${prefix}-district`}>İlçe *</label>
        <select
          id={`${prefix}-district`}
          className="form-control kn-tr-address-select"
          required
          disabled={disabled || !value.city || loadingDistricts}
          value={value.district}
          onChange={(e) => onDistrictChange(e.target.value)}
        >
          <option value="">{loadingDistricts ? "Yükleniyor…" : "İlçe seçin"}</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor={`${prefix}-neighborhood`}>Mahalle *</label>
        <select
          id={`${prefix}-neighborhood`}
          className="form-control kn-tr-address-select"
          required
          disabled={disabled || !value.district || loadingNeighborhoods}
          value={value.neighborhood}
          onChange={(e) => onChange({ neighborhood: e.target.value })}
        >
          <option value="">{loadingNeighborhoods ? "Yükleniyor…" : "Mahalle seçin"}</option>
          {neighborhoods.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor={`${prefix}-postal`}>Posta kodu</label>
        <input
          id={`${prefix}-postal`}
          className="form-control"
          readOnly
          tabIndex={-1}
          aria-readonly="true"
          placeholder="Mahalle seçilince otomatik dolar"
          value={value.postalCode}
        />
      </div>
      <div className="form-group kn-form-full">
        <label htmlFor={`${prefix}-line`}>Adres (sokak, bina no, daire) *</label>
        <textarea
          id={`${prefix}-line`}
          className="form-control"
          required
          rows={2}
          disabled={disabled}
          placeholder="Örn. 57/1 Sokak No:5/1a"
          value={value.line1}
          onChange={(e) => onChange({ line1: e.target.value })}
        />
      </div>
    </>
  );
}
