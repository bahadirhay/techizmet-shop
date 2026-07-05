"use client";

import { useEffect, useId, useRef, useState } from "react";
import { fetchTrAddressJson, primeTrAddressCache } from "@/lib/tr-address/client-fetch";

export type TurkeyAddressValue = {
  city: string;
  district: string;
  neighborhood: string;
  postalCode: string;
  line1: string;
};

type CityRow = { code: string; name: string };

export type TrAddressBootstrap = {
  cities?: CityRow[];
  city?: string;
  districts?: string[];
  district?: string;
  neighborhoods?: string[];
};

type Props = {
  value: TurkeyAddressValue;
  onChange: (patch: Partial<TurkeyAddressValue>) => void;
  idPrefix?: string;
  disabled?: boolean;
  bootstrap?: TrAddressBootstrap;
};

function districtsUrl(city: string) {
  return `/api/address/tr/districts?city=${encodeURIComponent(city)}`;
}

function neighborhoodsUrl(city: string, district: string) {
  return `/api/address/tr/neighborhoods?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`;
}

export function TurkeyAddressFields({
  value,
  onChange,
  idPrefix = "kn-addr",
  disabled = false,
  bootstrap,
}: Props) {
  const uid = useId();
  const prefix = idPrefix || uid.replace(/:/g, "");
  const [cities, setCities] = useState<CityRow[]>(bootstrap?.cities ?? []);
  const [districts, setDistricts] = useState<string[]>(
    bootstrap?.districts && value.city ? bootstrap.districts : [],
  );
  const [neighborhoods, setNeighborhoods] = useState<string[]>(
    bootstrap?.neighborhoods && value.city && value.district ? bootstrap.neighborhoods : [],
  );
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);
  const postalReq = useRef(0);
  const bootstrapApplied = useRef(false);

  useEffect(() => {
    primeTrAddressCache("/api/address/tr/cities", { cities: bootstrap?.cities ?? cities });
    if (bootstrap?.cities?.length) {
      setCities(bootstrap.cities);
      return;
    }
    if (cities.length) return;
    fetchTrAddressJson<{ cities: CityRow[] }>("/api/address/tr/cities").then((j) => {
      if (j?.cities) setCities(j.cities);
    });
  }, [bootstrap?.cities, cities.length]);

  useEffect(() => {
    if (!value.city) {
      setDistricts([]);
      setNeighborhoods([]);
      return;
    }

    if (
      !bootstrapApplied.current &&
      bootstrap?.city === value.city &&
      bootstrap.districts?.length
    ) {
      bootstrapApplied.current = true;
      primeTrAddressCache(districtsUrl(value.city), { districts: bootstrap.districts });
      setDistricts(bootstrap.districts);
      if (bootstrap.district === value.district && bootstrap.neighborhoods?.length) {
        primeTrAddressCache(neighborhoodsUrl(value.city, value.district), {
          neighborhoods: bootstrap.neighborhoods,
        });
        setNeighborhoods(bootstrap.neighborhoods);
      }
      return;
    }

    let cancelled = false;
    setLoadingDistricts(true);
    fetchTrAddressJson<{ districts: string[] }>(districtsUrl(value.city)).then((j) => {
      if (cancelled) return;
      setDistricts(j?.districts ?? []);
      setLoadingDistricts(false);
    });
    return () => {
      cancelled = true;
    };
  }, [value.city, bootstrap?.city, bootstrap?.district, bootstrap?.districts, bootstrap?.neighborhoods, value.district]);

  useEffect(() => {
    if (!value.city || !value.district) {
      setNeighborhoods([]);
      return;
    }
    if (
      bootstrapApplied.current &&
      bootstrap?.city === value.city &&
      bootstrap?.district === value.district &&
      bootstrap.neighborhoods?.length
    ) {
      return;
    }

    let cancelled = false;
    setLoadingNeighborhoods(true);
    fetchTrAddressJson<{ neighborhoods: string[] }>(
      neighborhoodsUrl(value.city, value.district),
    ).then((j) => {
      if (cancelled) return;
      setNeighborhoods(j?.neighborhoods ?? []);
      setLoadingNeighborhoods(false);
    });
    return () => {
      cancelled = true;
    };
  }, [value.city, value.district, bootstrap?.city, bootstrap?.district, bootstrap?.neighborhoods]);

  useEffect(() => {
    if (!value.city || !value.district || !value.neighborhood) return;
    const reqId = ++postalReq.current;
    fetchTrAddressJson<{ postalCode: string }>(
      `/api/address/tr/postal-code?city=${encodeURIComponent(value.city)}&district=${encodeURIComponent(value.district)}`,
    ).then((j) => {
      if (reqId !== postalReq.current) return;
      const code = j?.postalCode?.trim() ?? "";
      if (code) onChange({ postalCode: code });
    });
  }, [value.city, value.district, value.neighborhood, onChange]);

  function onCityChange(city: string) {
    bootstrapApplied.current = false;
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
