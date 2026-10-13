# Parking levels

**Problem** Every Evo parking sign on the map is the same P. Whether a lot is underground, an above-ground parkade or a surface lot, and which level the reserved spots are on, is only in the free-text title. In Evo's own member forum poll (June 2026) on which in-app pins would help, 70% voted for "car parking pins that differentiate between above and below ground parking lots". Members must avoid unmarked underground or aboveground parkade spots, so the level matters.

**Change** The sign shows its kind at a glance. An underground parkade has a black badge under the P with a down arrow and its level ("P1"), an above-ground parkade the same with an up arrow ("L3"). A surface lot and a street spot keep the plain sign: they are at ground level, so there is no level to show. The badge works on the selected sign too (cyan on black). The parking sheet and the full card get a second pill next to the hours: "Underground · Level P1", "Parkade · Level 3", "Surface lot" or "Street", with a small matching glyph. Cars, charging and trips are unchanged.

**Caption**

> 70% of Evo members voted for parking pins that tell above ground from below ground. Today every lot is the same P and the level hides in the title. Now the sign carries a down or up arrow and its level, and the card says it in one line: "Underground · Level P1".

Kind and level come from the spot's data (`kind`, `level`), never from the title. The map shows only the level; the card's pill carries the kind. Mock data is fictional; in the real app the level would come from structured lot data rather than parsing titles. A street spot has no level and is not a lot, so its pill says "Street" and its sign stays plain; the plain sign was never a promise of a lot, only of Evo bays.

Clip for X: `uv run _tools/record.py evo/03-feat-parking-levels` writes `media/clip.mp4` (local, not committed).

Preview: [../index.html#03-feat-parking-levels](../index.html#03-feat-parking-levels)
Live: [../mock/index.html?redline=03-feat-parking-levels](../mock/index.html?redline=03-feat-parking-levels)
