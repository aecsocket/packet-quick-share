install:
    gnome-extensions pack \
        --force \
        --extra-source=assets/
    gnome-extensions install --force *.zip

run: install
    dbus-run-session gnome-shell --devkit --wayland
