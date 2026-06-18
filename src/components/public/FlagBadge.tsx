const countryToIso2: Record<string, string> = {
  "Africa do Sul": "za",
  Alemanha: "de",
  "Arabia Saudita": "sa",
  Argelia: "dz",
  Argentina: "ar",
  Australia: "au",
  Austria: "at",
  Belgica: "be",
  Bosnia: "ba",
  Brasil: "br",
  "Cabo Verde": "cv",
  Canada: "ca",
  Catar: "qa",
  Colombia: "co",
  "Coreia do Sul": "kr",
  "Costa do Marfim": "ci",
  Croacia: "hr",
  Curacao: "cw",
  Egito: "eg",
  Equador: "ec",
  Escocia: "gb-sct",
  Espanha: "es",
  "Estados Unidos": "us",
  Franca: "fr",
  Gana: "gh",
  Haiti: "ht",
  Holanda: "nl",
  Ira: "ir",
  Iraque: "iq",
  Inglaterra: "gb-eng",
  Japao: "jp",
  Jordania: "jo",
  Marrocos: "ma",
  Mexico: "mx",
  "Nova Zelandia": "nz",
  Noruega: "no",
  Panama: "pa",
  Paraguai: "py",
  Portugal: "pt",
  "RD Congo": "cd",
  "Republica Tcheca": "cz",
  Senegal: "sn",
  Suica: "ch",
  Suecia: "se",
  Tunisia: "tn",
  Turquia: "tr",
  Uruguai: "uy",
  Uzbequistao: "uz"
};

function resolveFlagUrl(country: string) {
  const isoCode = countryToIso2[country];

  if (!isoCode) {
    return null;
  }

  if (isoCode.startsWith("gb-")) {
    return `https://flagcdn.com/${isoCode}.svg`;
  }

  return `https://flagcdn.com/${isoCode}.svg`;
}

type FlagBadgeProps = {
  country: string;
  className?: string;
};

export function FlagBadge({ country, className }: FlagBadgeProps) {
  const flagUrl = resolveFlagUrl(country);

  return (
    <span
      className={className ? `flag-badge ${className}` : "flag-badge"}
      aria-hidden="true"
      title={country}
    >
      {flagUrl ? (
        <img
          className="flag-badge__image"
          src={flagUrl}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="flag-badge__fallback">{country.slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  );
}
