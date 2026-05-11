## Refonte de l'en-tête PDF + modernisation de la mise en page

### Problèmes constatés sur ton PDF

En regardant ton export LPP, je vois clairement les défauts :
- Logo dimensionné en dur (22×22 mm) → s'écrase ou déborde selon le ratio uploadé
- Texte cabinet/contact placé à 26 mm fixes du bord → chevauche dès que le logo est plus large
- Date "11 mai 2026" et "Barèmes 2026" callés en haut à droite collés au logo si celui-ci est large
- Bandeau primaire de 32 mm avec titre ET contact ET logo entassés
- Typographie Helvetica par défaut, peu hiérarchisée (titre bandeau / sous-titre / sections de tailles trop proches)

### Plan de refonte (un seul fichier critique : `src/lib/pdf/builder.ts`)

#### 1. En-tête en deux zones distinctes (plus de chevauchement possible)

```text
┌────────────────────────────────────────────────────────────┐
│  ░░░░░░░░░ bandeau couleur 18 mm (mince) ░░░░░░░░░  date   │
├────────────────────────────────────────────────────────────┤
│ [LOGO]   PILIARYS                              Rapport     │
│  box    Sarah Karlyta                          Projection  │
│ 26×18   sarahpetitn@... · +971...              LPP         │
└────────────────────────────────────────────────────────────┘
   ↑ logo dans une "box" fixe, image fit:contain
```

- **Bandeau couleur réduit à 18 mm** (au lieu de 32) avec uniquement la date à droite et un fil fin
- **Bande blanche dessous (24 mm)** qui contient :
  - Logo dans une box fixe **26 mm large × 18 mm haut**, à `margin, 22`, image affichée en `object-fit: contain` (calcul du ratio fait à partir des dimensions naturelles via `doc.getImageProperties`) → un logo carré, vertical ou horizontal occupe la même boîte sans déborder
  - Si pas de logo : la zone texte commence directement à `margin`
  - **Zone identité** à `margin + 30` : ligne 1 = nom du cabinet (bold 14), ligne 2 = nom prénom du courtier (regular 10), ligne 3 = email · téléphone (muted 9)
  - **Zone titre** à droite (right-aligned) : "RAPPORT" (uppercase 8 muted) + titre (bold 13) sur 2 lignes max
- **Filet horizontal fin couleur primaire** sous tout l'en-tête → sépare clairement de la zone contenu
- **Sous-titre** (ex. "Genève · 2026") en gris sur la zone contenu, pas dans le bandeau

#### 2. Logo robuste à n'importe quel format

- Lire `doc.getImageProperties(dataUrl)` pour récupérer largeur/hauteur natives
- Calculer `scale = min(boxW / w, boxH / h)`, centrer dans la box
- Try/catch silencieux si image illisible
- Détecter PNG **et** JPEG via `image/jpeg|jpg` (actuellement seul `image/jpeg` est testé)

#### 3. Modernisation typographique

- **Adopter une seule police variable** : enregistrer la famille **Inter** (déjà utilisée dans l'app) en TTF base64 dans `src/lib/pdf/fonts/inter.ts` (Regular + Medium + Bold), puis `doc.addFileToVFS` + `doc.addFont`. Fallback Helvetica si l'enregistrement échoue.
- **Échelle hiérarchique cohérente** :
  - Titre rapport en-tête : 14 bold
  - Cabinet : 13 bold
  - Sections (`section()`) : 12 bold + petit carré couleur primaire (au lieu du trait court actuel)
  - Sous-sections : 10 bold uppercase tracking légèrement positif
  - Corps : 10 regular
  - Légendes / labels : 8 medium uppercase muted
- **Couleurs neutres revues** : ink `#0F172A`, muted `#64748B`, surface `#F8FAFC`, border `#E2E8F0` (alignées sur la charte Tailwind du produit)
- **Tuiles `metricsGrid`** : padding augmenté à 4 mm, hauteur 22 mm, label en 7.5 medium uppercase + valeur en 14 bold, séparateur 0.5 mm couleur primaire à gauche (bord coloré façon "card") → look plus "dashboard moderne"
- **Tableaux (`table`)** : header en couleur primaire conservé mais arrondi top, lignes alternées plus subtiles (`#FAFBFC`), padding 2.5, séparateurs très fins → look financier épuré
- **Bandeaux situation/projection** : passer en plat (sans arrondi), filet vertical couleur à gauche 1.5 mm pour différencier visuellement (style "alert" moderne)

#### 4. Pied de page modernisé

- Filet supérieur fin en couleur primaire (au lieu de gris)
- À gauche : note légale (8 muted)
- Au centre : nom du cabinet ou "Document de travail" (8 muted)
- À droite : `Page X / Y` en medium

#### 5. Marge de garde sur le contenu

- `cursorY` initial passe de 50 à **52 mm** pour respirer après l'en-tête haut de 42 mm
- Ajouter un `subtitle` en gris sur cette zone si fourni (déjà présent, à repositionner)

### Ce qui ne change PAS

- API publique de `ReportPdf` (sections, paragraph, kvTable, table, metricsGrid, callouts) reste **identique** → aucun calculateur à modifier
- `BrokerHeader` / `PdfHeaderInfo` inchangés
- Hook `useBrokerPdfHeader` inchangé
- Aucun changement DB

### Fichiers touchés

- `src/lib/pdf/builder.ts` — refonte de `drawHeader()`, `section()`, `metricsGrid()`, `table()`, `drawFooter()`, `situationBanner()`, `projectionBanner()`
- `src/lib/pdf/fonts/inter.ts` — **nouveau** : data URL des 3 graisses Inter encodées + helper `registerInterFont(doc)`
- (rien d'autre)

### Vérification

Après implémentation, je régénère un PDF LPP avec ton profil (Piliarys / logo carré) **et** un cas test avec un logo très horizontal (style 3:1) pour confirmer qu'aucun chevauchement n'est possible.
