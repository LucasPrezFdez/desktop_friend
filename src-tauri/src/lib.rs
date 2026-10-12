use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

/// Evento con el que la bandeja habla con el frontend (ver `src/desktop.ts`).
const COMMAND_EVENT: &str = "pet-command";

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
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_window(tray.app_handle());
                send(tray.app_handle(), "come");
            }
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
