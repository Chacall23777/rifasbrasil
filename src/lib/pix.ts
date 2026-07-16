// Gerador de payload PIX BR Code (padrão EMV do Banco Central).
// 100% client-side, sem APIs externas.

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function stripAccents(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export interface PixPayloadInput {
  chave: string;
  valor: number;
  nomeRecebedor: string;
  cidade?: string;
  descricao?: string;
  txid?: string;
}

export function gerarPixPayload({
  chave,
  valor,
  nomeRecebedor,
  cidade = "BRASIL",
  descricao,
  txid = "***",
}: PixPayloadInput): string {
  const gui = tlv("00", "br.gov.bcb.pix");
  const chaveTlv = tlv("01", chave.trim());
  const descTlv = descricao ? tlv("02", stripAccents(descricao).slice(0, 72)) : "";
  const merchantAccountInfo = tlv("26", gui + chaveTlv + descTlv);

  const nome = stripAccents(nomeRecebedor).slice(0, 25).toUpperCase();
  const cidadeFmt = stripAccents(cidade).slice(0, 15).toUpperCase();
  const valorFmt = valor.toFixed(2);

  const payloadWithoutCrc =
    tlv("00", "01") +
    tlv("01", "12") + // dinâmico não; 11 = estático usável várias vezes
    merchantAccountInfo +
    tlv("52", "0000") +
    tlv("53", "986") +
    tlv("54", valorFmt) +
    tlv("58", "BR") +
    tlv("59", nome || "RIFASBRASIL") +
    tlv("60", cidadeFmt || "BRASIL") +
    tlv("62", tlv("05", txid.slice(0, 25))) +
    "6304";

  return payloadWithoutCrc + crc16(payloadWithoutCrc);
}
