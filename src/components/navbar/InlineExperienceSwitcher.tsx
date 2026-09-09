// TT.55 · Diego 2026-09-08 · Inline experience switcher (usado via leftSlot
// del Navbar prod en Expert Hub / QC pages).
//
// TT.63 · Diego 2026-09-08 · re-implementado como wrapper del rich
// ExperienceSwitcher (sections "Published products" · "Standalone demos" ·
// related counts · fechas · badges) para consistencia con el switcher que
// aparece al cargar por primera vez (Time Tracker default · host Navbar).
// Antes era un popover custom minimal — pero cambiar la shape del dropdown
// entre experiencias rompía la sensación de "un solo sistema".

import ExperienceSwitcher from './ExperienceSwitcher'

export default function InlineExperienceSwitcher() {
    return <ExperienceSwitcher />
}
