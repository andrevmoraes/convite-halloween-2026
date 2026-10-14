const IMAGE_TYPE = 'image/webp';
const DEFAULT_QUALITY = 0.88;

function carregarImagem(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não foi possível ler a imagem selecionada.'));
    };
    image.src = objectUrl;
  });
}

function gerarBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('O navegador não conseguiu processar a imagem.'));
        return;
      }

      resolve(blob);
    }, IMAGE_TYPE, quality);
  });
}

/**
 * Converte imagens para WebP e reduz apenas dimensões que excedem o limite.
 * A qualidade 0.88 preserva boa qualidade visual com uma redução significativa
 * de tamanho em relação a JPEG/PNG originais.
 */
export async function processarImagem(
  file,
  { maxDimension = 1600, quality = DEFAULT_QUALITY } = {},
) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem válido.');
  }

  const image = await carregarImagem(file);
  const largestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = Math.min(1, maxDimension / largestSide);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(image, 0, 0, width, height);

  const blob = await gerarBlob(canvas, quality);
  const baseName = file.name.replace(/\.[^/.]+$/, '') || 'imagem';
  return new File([blob], `${baseName}.webp`, {
    type: IMAGE_TYPE,
    lastModified: Date.now(),
  });
}
