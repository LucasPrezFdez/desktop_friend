use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

/// Evento con el que la bandeja habla con el frontend (ver `src/desktop.ts`).
const COMMAND_EVENT: &str = "pet-command";
/// Evento con el que la bandeja le dice a qué pantalla llevar a la mascota. Lleva su nombre.
const MONITOR_EVENT: &str = "pet-monitor";

fn send(app: &AppHandle, command: &str) {
    let _ = app.emit(COMMAND_EVENT, command);
}

fn show_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
    }
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

/// La ventana de la cama se maneja con la API de Windows y no con la de Tauri, cuyo `show()`
/// activa la ventana: le quitaría el foco a la del perro en pleno arrastre y quedaría por delante.
mod bed {
    use tauri::{AppHandle, Manager};
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowLongPtrW, SetWindowLongPtrW, SetWindowPos, ShowWindow, GWL_EXSTYLE,
        SWP_NOACTIVATE, SWP_NOSIZE, SWP_SHOWWINDOW, SW_HIDE, WS_EX_APPWINDOW, WS_EX_TOOLWINDOW,
    };

    fn handle(app: &AppHandle, label: &str) -> Result<HWND, String> {
        app.get_webview_window(label)
            .ok_or(format!("no existe la ventana {label}"))?
            .hwnd()
            .map_err(|error| error.to_string())
    }

    /// Es solo un dibujo sobre el escritorio: el ratón la atraviesa siempre y, como ventana de
    /// herramientas, no sale en la barra de tareas ni al cambiar de ventana con Alt+Tab.
    pub fn prepare(app: &AppHandle) -> Result<(), String> {
        let window = app
            .get_webview_window("bed")
            .ok_or("no existe la ventana bed")?;
        window
            .set_ignore_cursor_events(true)
            .map_err(|error| error.to_string())?;
        let bed = handle(app, "bed")?;
        unsafe {
            let style = GetWindowLongPtrW(bed, GWL_EXSTYLE) as u32;
            let style = (style & !WS_EX_APPWINDOW.0) | WS_EX_TOOLWINDOW.0;
            SetWindowLongPtrW(bed, GWL_EXSTYLE, style as isize);
        }
        Ok(())
    }

    /// La muestra en `x`, `y` (píxeles físicos), sin activarla y justo debajo de la del perro.
    pub fn place(app: &AppHandle, x: i32, y: i32) -> Result<(), String> {
        let (bed, dog) = (handle(app, "bed")?, handle(app, "main")?);
        unsafe {
            SetWindowPos(
                bed,
                Some(dog),
                x,
                y,
                0,
                0,
                SWP_NOACTIVATE | SWP_NOSIZE | SWP_SHOWWINDOW,
            )
        }
        .map_err(|error| error.to_string())
    }

    pub fn stow(app: &AppHandle) -> Result<(), String> {
        let bed = handle(app, "bed")?;
        unsafe {
            let _ = ShowWindow(bed, SW_HIDE);
        }
        Ok(())
    }
}

/// Saca la cama al escritorio (ver `showBed` en `src/desktop.ts`).
#[tauri::command]
fn place_bed(app: AppHandle, x: i32, y: i32) -> Result<(), String> {
    bed::place(&app, x, y)
}

/// Retira la cama del escritorio.
#[tauri::command]
fn stow_bed(app: AppHandle) -> Result<(), String> {
    bed::stow(&app)
}

/// El submenú "Cambiar de pantalla" de la bandeja: una entrada por pantalla, con la marca en la que
/// tiene a la mascota. Con una sola pantalla no hay nada que elegir y el submenú no está.
mod monitors {
    use std::sync::Mutex;
    use tauri::menu::{CheckMenuItem, Menu, Submenu};
    use tauri::{AppHandle, Manager, Wry};

    /// Las entradas se llaman así, seguido del nombre que Windows da a la pantalla.
    const PREFIX: &str = "monitor:";
    /// Sitio del submenú en el menú de la bandeja: detrás de "Cambiar de mascota".
    const POSITION: usize = 3;

    #[derive(PartialEq)]
    struct Entry {
        name: String,
        label: String,
        checked: bool,
    }

    pub struct Picker {
        menu: Menu<Wry>,
        submenu: Submenu<Wry>,
        /// Lo que hay ahora mismo en el submenú.
        shown: Mutex<Vec<(Entry, CheckMenuItem<Wry>)>>,
    }

    /// El número de `\\.\DISPLAY2`, que suele ser el que enseña la configuración de Windows.
    fn number(name: &str, order: usize) -> usize {
        name.trim_start_matches(|c: char| !c.is_ascii_digit())
            .parse()
            .unwrap_or(order + 1)
    }

    fn entries(app: &AppHandle) -> Vec<Entry> {
        let Some(window) = app.get_webview_window("main") else {
            return Vec::new();
        };
        let name_of = |monitor: tauri::Result<Option<tauri::Monitor>>| {
            monitor.ok().flatten().and_then(|monitor| monitor.name().cloned())
        };
        let current = name_of(window.current_monitor());
        let primary = name_of(window.primary_monitor());
        let mut monitors: Vec<_> = window
            .available_monitors()
            .unwrap_or_default()
            .into_iter()
            .enumerate()
            .filter_map(|(order, monitor)| {
                let name = monitor.name()?.clone();
                Some((number(&name, order), name, *monitor.size()))
            })
            .collect();
        if monitors.len() < 2 {
            return Vec::new();
        }
        monitors.sort_by_key(|(number, ..)| *number);
        monitors
            .into_iter()
            .map(|(number, name, size)| {
                let main = if primary.as_ref() == Some(&name) { " (principal)" } else { "" };
                Entry {
                    label: format!("Pantalla {number}{main} · {} × {}", size.width, size.height),
                    checked: current.as_ref() == Some(&name),
                    name,
                }
            })
            .collect()
    }

    /// Crea el submenú, vacío y sin poner: `refresh` lo rellena y lo pone si hay donde elegir.
    pub fn install(app: &AppHandle, menu: &Menu<Wry>) -> tauri::Result<()> {
        let submenu = Submenu::with_id(app, "monitors", "Cambiar de pantalla", true)?;
        app.manage(Picker {
            menu: menu.clone(),
            submenu,
            shown: Mutex::new(Vec::new()),
        });
        refresh(app)
    }

    /// Pone el submenú al día con las pantallas que hay conectadas y con dónde está la mascota.
    pub fn refresh(app: &AppHandle) -> tauri::Result<()> {
        let Some(picker) = app.try_state::<Picker>() else {
            return Ok(());
        };
        let wanted = entries(app);
        let mut shown = picker.shown.lock().unwrap();
        // Si no ha cambiado nada no se toca: el menú puede estar abierto.
        if shown.iter().map(|(entry, _)| entry).eq(wanted.iter()) {
            return Ok(());
        }
        if shown.is_empty() {
            picker.menu.insert(&picker.submenu, POSITION)?;
        }
        for (_, item) in shown.drain(..) {
            picker.submenu.remove(&item)?;
        }
        for entry in wanted {
            let id = format!("{PREFIX}{}", entry.name);
            let item = CheckMenuItem::with_id(app, id, &entry.label, true, entry.checked, None::<&str>)?;
            picker.submenu.append(&item)?;
            shown.push((entry, item));
        }
        if shown.is_empty() {
            picker.menu.remove(&picker.submenu)?;
        }
        Ok(())
    }

    /// Si `id` es una de las entradas, deja la marca solo en ella y devuelve el nombre de su pantalla.
    pub fn pick(app: &AppHandle, id: &str) -> Option<String> {
        let name = id.strip_prefix(PREFIX)?;
        let picker = app.try_state::<Picker>()?;
        // Windows ya ha cambiado la marca de la entrada pulsada; las demás hay que quitarlas a mano.
        for (entry, item) in picker.shown.lock().unwrap().iter_mut() {
            entry.checked = entry.name == name;
            let _ = item.set_checked(entry.checked);
        }
        Some(name.to_string())
    }
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let autostart_on = app.autolaunch().is_enabled().unwrap_or(false);

    let feed = MenuItem::with_id(app, "feed", "Dar de comer", true, None::<&str>)?;
    let come = MenuItem::with_id(app, "come", "Traer aquí", true, None::<&str>)?;
    let pets = MenuItem::with_id(app, "pets", "Cambiar de mascota", true, None::<&str>)?;
    let toggle = MenuItem::with_id(app, "toggle", "Mostrar u ocultar", true, None::<&str>)?;
    let autostart = CheckMenuItem::with_id(
        app,
        "autostart",
        "Arrancar con Windows",
        true,
        autostart_on,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &feed,
            &come,
            &pets,
            &toggle,
            &PredefinedMenuItem::separator(app)?,
            &autostart,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;
    monitors::install(app, &menu)?;

    let mut tray = TrayIconBuilder::with_id("main")
        .tooltip("DesktopFriend")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "toggle" => {
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                    }
                }
            }
            "autostart" => {
                let manager = app.autolaunch();
                let enabled = manager.is_enabled().unwrap_or(false);
                let result = if enabled { manager.disable() } else { manager.enable() };
                if result.is_err() {
                    // El menú ya cambió la marca: se devuelve a su estado real.
                    let _ = autostart.set_checked(enabled);
                }
            }
            // El frontend guarda el estado antes de pedir la salida con `quit_app`.
            "feed" | "come" | "pets" | "quit" => {
                if event.id.as_ref() != "quit" {
                    show_window(app);
                }
                send(app, event.id.as_ref());
            }
            id => {
                if let Some(monitor) = monitors::pick(app, id) {
                    show_window(app);
                    let _ = app.emit(MONITOR_EVENT, monitor);
                }
            }
        })
        .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } => {
                show_window(tray.app_handle());
                send(tray.app_handle(), "come");
            }
            // El menú se abre al soltar el botón derecho: al pulsarlo es el momento de ponerle al
            // día las pantallas.
            TrayIconEvent::Click {
                button: MouseButton::Right,
                button_state: MouseButtonState::Down,
                ..
            } => {
                let _ = monitors::refresh(tray.app_handle());
            }
            _ => {}
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_window(app);
            send(app, "come");
        }))
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .invoke_handler(tauri::generate_handler![quit_app, place_bed, stow_bed])
        .setup(|app| {
            build_tray(app.handle())?;
            bed::prepare(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error al arrancar DesktopFriend");
}
