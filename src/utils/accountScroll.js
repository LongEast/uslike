export function selectAccountSection(sectionIds, sectionTops, observationLine, pageBottom = false) {
  if (!sectionIds.length) return null;
  if (pageBottom) return sectionIds.at(-1);
  let activeSection = sectionIds[0];
  sectionIds.forEach((id) => {
    if (sectionTops[id] <= observationLine) activeSection = id;
  });
  return activeSection;
}
