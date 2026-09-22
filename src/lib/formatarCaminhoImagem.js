export const PLACEHOLDER_PROFILE =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"%3E%3Crect width="400" height="400" fill="%23666666"/%3E%3Ccircle cx="200" cy="145" r="72" fill="%23bdbdbd"/%3E%3Cpath d="M80 370c18-88 72-130 120-130s102 42 120 130" fill="%23bdbdbd"/%3E%3C/svg%3E';

export function formatarCaminhoImagem(caminho) {
  if (!caminho || typeof caminho !== 'string') {
    return PLACEHOLDER_PROFILE;
  }

  let caminhoFormatado = caminho.trim().replace(/\\/g, '/');
  caminhoFormatado = caminhoFormatado.replace(/^public\//i, '');

  return `/${caminhoFormatado.replace(/^\/+/, '')}`;
}
