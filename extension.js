import Clutter from "gi://Clutter";
import GObject from "gi://GObject";
import Gio from "gi://Gio";
import St from "gi://St";

import * as Main from "resource:///org/gnome/shell/ui/main.js";

import {
    Extension,
    gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";
import * as QuickSettings from "resource:///org/gnome/shell/ui/quickSettings.js";

let icons = {};

export const AppButton = GObject.registerClass(
    class AppButton extends St.Button {
        constructor() {
            super({
                style_class: "icon-button",
                can_focus: true,
                child: new St.Icon({
                    gicon: icons.app,
                }),
                accessible_name: _("Open Quick Share app"),
            });

            this.connect("clicked", () => {
                // tailscale.exit_node = "";
                // this.reactive = false;
            });
        }
    },
);

const QuickShareToggle = GObject.registerClass(
    class QuickShareToggle extends QuickSettings.QuickMenuToggle {
        constructor() {
            super({
                title: _("Quick Share"),
                gicon: icons.quickShare,
                toggleMode: true,
                menuEnabled: true,
            });

            const actionLayout = new Clutter.GridLayout();
            const actionBar = new St.Widget({
                layout_manager: actionLayout,
            });

            this.menu._headerSpacer.x_align = Clutter.ActorAlign.END;
            this.menu._headerSpacer.add_child(actionBar);

            const settingsButton = new AppButton();
            actionLayout.attach(settingsButton, 0, 0, 1, 1);

            this.connect("notify::checked", () => this.updateHeader());
            this.updateHeader();
        }

        updateHeader() {
            const subtitle = this.checked
                ? _("Visible and ready to receive")
                : _("Not visible to other devices");
            this.menu.setHeader(this.gicon, this.title, subtitle);
        }
    },
);

const QuickShareIndicator = GObject.registerClass(
    class QuickShareIndicator extends QuickSettings.SystemIndicator {
        constructor() {
            super();

            this._indicator = this._addIndicator();
            this._indicator.gicon = icons.quickShare;

            const toggle = new QuickShareToggle();
            toggle.bind_property(
                "checked",
                this._indicator,
                "visible",
                GObject.BindingFlags.SYNC_CREATE,
            );
            this.quickSettingsItems.push(toggle);
        }
    },
);

export default class QuickShareExtension extends Extension {
    enable() {
        icons.quickShare = Gio.icon_new_for_string(
            `${this.path}/assets/quick-share-symbolic.svg`,
        );
        icons.app = Gio.icon_new_for_string(
            `${this.path}/assets/io.github.nozwock.Packet-symbolic.svg`,
        );

        this._indicator = new QuickShareIndicator();
        Main.panel.statusArea.quickSettings.addExternalIndicator(
            this._indicator,
        );
    }

    disable() {
        icons = {};
        this._indicator.quickSettingsItems.forEach((item) => item.destroy());
        this._indicator.destroy();
    }
}
