# linkedin-employees

Bir firmanın LinkedIn çalışanlarını [Apify](https://apify.com) üzerindeki `harvestapi` actor'larıyla listeler.

- Liste: `harvestapi/linkedin-company-employees`
- Detay (`--enrich`): `harvestapi/linkedin-profile-scraper` (yalnızca profil URL'si alır, firma çalışanı listelemez)

## Kurulum
Node >= 20 gerekir, bağımlılık yoktur.

    export APIFY_TOKEN=...   # https://console.apify.com/account/integrations

## Kullanım

    node src/index.mjs --company https://www.linkedin.com/company/microsoft/ --max 100 --title engineer --enrich --out calisanlar.csv

Seçenekler dosyanın başındaki yorumda listelidir. Actor input alan adları değişirse `--input-json '{"..."}'` ile ezin.
