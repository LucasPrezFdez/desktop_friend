// Evita que se abra una consola junto a la app en las compilaciones de release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    desktopfriend_lib::run()
}
