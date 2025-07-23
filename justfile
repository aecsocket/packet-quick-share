install:
    gnome-extensions pack \
        --force \
        --extra-source=assets/
    gnome-extensions install --force *.zip

run: install
    MUTTER_DEBUG_DUMMY_MODE_SPECS=1920x1080 dbus-run-session -- gnome-shell --nested --wayland
