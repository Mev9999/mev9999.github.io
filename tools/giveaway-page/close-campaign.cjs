module.exports = function closeCampaign(doc, config, lang) {
  if (config.status !== 'closed') return;
  const copy = {
    de: ['Das Gewinnspiel ist beendet. Eine Teilnahme ist nicht mehr möglich.', 'Herzlichen Glückwunsch!', 'Gewonnen hat', 'Vielen Dank an alle, die mitgemacht haben!', 'Teilnahme beendet', 'Gewinnspiel beendet'],
    en: ['The giveaway has ended. Entries are now closed.', 'Congratulations!', 'The winner is', 'Thank you to everyone who took part!', 'Entries closed', 'Giveaway ended'],
    bs: ['Nagradna igra je završena. Učešće više nije moguće.', 'Čestitamo!', 'Dobitnik je', 'Hvala svima koji su učestvovali!', 'Učešće završeno', 'Nagradna igra završena']
  }[lang];
  const form = doc.querySelector('#giveaway-form');
  form.dataset.closed = 'true';
  form.removeAttribute('action');
  form.querySelectorAll('input,select,textarea,button').forEach(control => control.disabled = true);
  form.querySelector('[type=submit]').textContent = copy[4];
  doc.querySelector('#form-status').textContent = copy[0];
  doc.querySelector('#campaign-status').textContent = copy[0];
  doc.querySelector('.draft-info').textContent = copy[0];
  const winner = doc.querySelector('.winner');
  winner.replaceChildren();
  for (const [tag, text] of [['p',copy[5]],['h2',copy[1]],['p',`${copy[2]} @${config.winnerAnnouncement}.`],['p',copy[3]]]) {
    const node = doc.createElement(tag); node.textContent = text; winner.append(node);
  }
  winner.firstElementChild.className = 'eyebrow';
  winner.id = 'gewinner';
  doc.querySelectorAll('a[href="#mitmachen"],a[href="#giveaway-form"]').forEach(link => {
    link.textContent = copy[5]; link.href = '#gewinner';
  });
  const script = doc.querySelector('script[src^="gewinnspiel.js"]');
  script.src = 'gewinnspiel.js?v=20261014-closed';
};
