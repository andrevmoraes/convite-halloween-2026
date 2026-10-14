export function isConvidadoConfirmado(convidado) {
  if (!convidado?.data_votada) {
    return false;
  }

  try {
    const dadosVotacao = JSON.parse(convidado.data_votada);
    return dadosVotacao?.presenca === 'sim';
  } catch {
    return false;
  }
}
