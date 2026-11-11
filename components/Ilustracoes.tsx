// Ilustrações do app, desenhadas em SVG: tudo no tema "caderno de concurso"
// (cartão-resposta, caneta azul, marca-texto, apostilas).

const PAPEL = "#ffffff";
const BORDA = "#c9d3ee";
const TINTA = "#101936";
const AZUL = "#1b3fd1";
const MARCA = "#ffe45c";

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="16" cy="16" r="8" fill={MARCA} />
      <path d="M12.2 16.4l2.6 2.6 5-5.4" fill="none" stroke={TINTA} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Ilustração principal do login: cartão-resposta sendo preenchido com a caneta. */
export function GabaritoArte({ className }: { className?: string }) {
  const letras = ["A", "B", "C", "D", "E"];
  const marcadas = [1, 3, 0, -1, 4, -1]; // alternativa marcada por linha (-1 = em branco)
  const linhas = [0, 1, 2, 3, 4, 5];

  return (
    <svg className={className} viewBox="0 0 520 460" role="img" aria-label="Cartão-resposta sendo preenchido com uma caneta azul">
      {/* Folha de apostila ao fundo, com trecho grifado */}
      <g transform="rotate(-7 200 235)">
        <rect x="60" y="70" width="260" height="330" rx="12" fill={PAPEL} stroke={BORDA} strokeWidth="2" />
        <rect x="86" y="104" width="120" height="12" rx="6" fill={TINTA} opacity="0.85" />
        {[136, 160, 184, 208, 232, 256].map((y, i) => (
          <rect key={y} x="86" y={y} width={i % 3 === 2 ? 130 : 190} height="8" rx="4" fill="#dbe2f1" />
        ))}
        <rect x="84" y="156" width="150" height="16" rx="3" fill={MARCA} opacity="0.9" />
        <rect x="86" y="160" width="146" height="8" rx="4" fill="#9aa5c7" opacity="0.7" />
        {[290, 314, 338].map((y) => (
          <rect key={y} x="86" y={y} width="170" height="8" rx="4" fill="#dbe2f1" />
        ))}
      </g>

      {/* Cartão-resposta */}
      <g transform="rotate(3 295 225)">
        <rect x="150" y="40" width="290" height="372" rx="14" fill={PAPEL} stroke={BORDA} strokeWidth="2" />
        <rect x="176" y="62" width="110" height="12" rx="6" fill={TINTA} />
        <rect x="300" y="62" width="110" height="12" rx="6" fill="#dbe2f1" />
        {letras.map((l, j) => (
          <text key={l} x={235 + j * 38} y="106" textAnchor="middle" fontSize="12" fontWeight="700" fill="#5a6485" fontFamily="Public Sans, system-ui, sans-serif">
            {l}
          </text>
        ))}
        {linhas.map((i) => (
          <g key={i}>
            <text x="180" y={135 + i * 44} fontSize="14" fontWeight="700" fill="#5a6485" fontFamily="Public Sans, system-ui, sans-serif">
              {i + 1}
            </text>
            {letras.map((l, j) => {
              const cx = 235 + j * 38;
              const cy = 130 + i * 44;
              const marcada = marcadas[i] === j;
              const nova = i === 3 && j === 2; // a bolha que a caneta está preenchendo
              return (
                <g key={l}>
                  <circle cx={cx} cy={cy} r="13" fill="none" stroke={TINTA} strokeWidth="2" />
                  {marcada && <circle cx={cx} cy={cy} r="11" fill={TINTA} />}
                  {nova && <circle className="art-nova-bolha" cx={cx} cy={cy} r="11" fill={AZUL} />}
                </g>
              );
            })}
          </g>
        ))}
      </g>

      {/* Caneta azul */}
      <g transform="translate(346 248) rotate(-35)">
        <polygon points="0,-9 -28,0 0,9" fill="#e8ecfb" stroke={BORDA} strokeWidth="1.5" strokeLinejoin="round" />
        <polygon points="-20,-3 -28,0 -20,3" fill={TINTA} />
        <rect x="0" y="-9" width="150" height="18" rx="9" fill={AZUL} />
        <rect x="104" y="-9" width="9" height="18" fill={MARCA} />
        <rect x="150" y="-6" width="30" height="12" rx="4" fill={TINTA} />
      </g>
    </svg>
  );
}

/** Pilha de apostilas com caneta e marca-texto, usada na faixa do painel. */
export function ApostilaArte({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 250 150" aria-hidden="true">
      <rect x="22" y="104" width="150" height="26" rx="5" fill={AZUL} />
      <rect x="22" y="104" width="150" height="7" rx="3" fill="#3d5cf0" />
      <rect x="34" y="122" width="60" height="4" rx="2" fill="#fff" opacity="0.7" />
      <rect x="40" y="78" width="132" height="26" rx="5" fill={MARCA} />
      <rect x="52" y="93" width="54" height="4" rx="2" fill={TINTA} opacity="0.7" />
      <rect x="30" y="52" width="138" height="26" rx="5" fill="#fff" />
      <rect x="30" y="52" width="138" height="7" rx="3" fill="#e8ecfb" />
      <rect x="44" y="68" width="68" height="4" rx="2" fill={AZUL} opacity="0.8" />
      <g transform="translate(172 34) rotate(52)">
        <rect x="0" y="-6" width="78" height="12" rx="6" fill={MARCA} />
        <rect x="52" y="-6" width="6" height="12" fill={TINTA} />
        <polygon points="0,-6 -12,0 0,6" fill="#e8ecfb" />
      </g>
      <circle cx="30" cy="34" r="13" fill="none" stroke="#fff" strokeWidth="2.5" opacity="0.7" />
      <circle cx="30" cy="34" r="8" fill={MARCA} />
    </svg>
  );
}
