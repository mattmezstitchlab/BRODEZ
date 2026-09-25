# BRODEZ

Studio web de création de broderie au point de croix.

Fonctionnel : génération depuis une intention textuelle, exemples, grille de croix, palette DMC, tailles de toile, aperçu pseudo-3D face/45°/grille et export SVG.

Lancement : npm install puis npm run dev.

Architecture prévue : intention → composition → grille → palette → ordre des points → validation → export machine. Les formats DST/PES/JEF/EXP ne sont pas déclarés disponibles tant que le moteur machine n’est pas réellement implémenté et validé.
