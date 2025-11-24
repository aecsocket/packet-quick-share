/**
 * @typedef {import("@girs/gjs")}
 * @typedef {import("@girs/gjs/dom")}
 * @typedef {import("@girs/gnome-shell/ambient")}
 * @typedef {import("@girs/gnome-shell/extensions/global")}
 */

import Clutter from "gi://Clutter";
import GObject from "gi://GObject";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import St from "gi://St";

import * as Main from "resource:///org/gnome/shell/ui/main.js";

import {
  Extension,
  gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";
import * as QuickSettings from "resource:///org/gnome/shell/ui/quickSettings.js";

// const APP_ID = "io.github.nozwock.Packet";
const APP_ID = "io.github.nozwock.Packet.Devel";

// const BUS_NAME = "io.github.nozwock.Packet.Api";
const BUS_NAME = "io.github.nozwock.Packet.Devel.Api";

// const OBJECT_NAME = "/io/github/nozwock/Packet";
const OBJECT_NAME = "/io/github/nozwock/Packet/Devel";

export default class QuickShareExtension extends Extension {
  /** @type {QuickShareIndicator} */
  _indicator;

  enable() {
    if (!GLib.spawn_command_line_sync(`flatpak info ${APP_ID}`)) {
      Main.notifyError(
        _("Quick Share unavailable"),
        _("Packet app must be installed for Quick Share to function"),
      );
    }

    const assets = makeAssets(this.path);
    const indicator = new QuickShareIndicator(assets);

    const toggle = new QuickShareToggle(assets);
    toggle.bind_property(
      "checked",
      indicator.icon,
      "visible",
      GObject.BindingFlags.SYNC_CREATE,
    );
    indicator.quickSettingsItems.push(toggle);

    Main.panel.statusArea.quickSettings.addExternalIndicator(indicator);

    GLib.spawn_command_line_async(`flatpak run ${APP_ID} --background`);
    PacketProxy(Gio.DBus.session, BUS_NAME, OBJECT_NAME, (proxy, err) => {
      if (err != null) {
        Main.notifyError(
          _("Quick Share unavailable"),
          _(`Failed to start DBus proxy: ${err}`),
        );
        return;
      }

      /** @type {PacketApi} */
      const packetApi = proxy;
      toggle.setPacketApi(packetApi);
    });

    this._indicator = indicator;
  }

  disable() {
    this._indicator.quickSettingsItems.forEach((item) => item.destroy());
    this._indicator.destroy();
    this._indicator = null;
  }
}

/**
 * @typedef {Object} Assets
 * @property {Gio.Icon} quickShare
 * @property {Gio.Icon} settings
 */

/**
 * @param {string} path
 * @returns {Assets}
 */
function makeAssets(path) {
  const icon = (name) =>
    Gio.icon_new_for_string(`${path}/assets/${name}-symbolic.svg`);
  return {
    quickShare: icon("quick-share"),
    settings: icon("settings"),
  };
}

const IFACE = `
<node>
  <interface name="io.github.nozwock.Packet1">
    <property name="DeviceName" type="s" access="read"/>
    <property name="DeviceVisibility" type="b" access="readwrite"/>
  </interface>
</node>
`;

/**
 * @typedef {Object} PacketApi
 * @property {string} DeviceName
 * @property {boolean} DeviceVisibility
 */
export const PacketProxy = Gio.DBusProxy.makeProxyWrapper(IFACE);

export const QuickShareToggle = GObject.registerClass(
  class QuickShareToggle extends QuickSettings.QuickMenuToggle {
    /** @type {PacketApi} */
    _packetApi;

    /**
     * @param {Assets} assets
     */
    constructor(assets) {
      super({
        title: _("Quick Share"),
        gicon: assets.quickShare,
        toggleMode: true,
        menuEnabled: true,
      });

      const actionLayout = new Clutter.GridLayout();
      const actionBar = new St.Widget({
        layout_manager: actionLayout,
      });

      this.menu._headerSpacer.x_align = Clutter.ActorAlign.END;
      this.menu._headerSpacer.add_child(actionBar);

      const appButton = new AppButton(assets);
      actionLayout.attach(appButton, 0, 0, 1, 1);

      this._updateHeader();
    }

    _updateHeader() {
      /** @type {boolean} */
      let checked;
      /** @type {string} */
      let subtitle;
      /** @type {string} */
      let headerSubtitle;

      if (this._packetApi) {
        if (this._packetApi.DeviceVisibility) {
          const deviceName = this._packetApi.DeviceName;
          checked = true;
          subtitle = deviceName;
          headerSubtitle = `Visible as “${deviceName}”`;
        } else {
          checked = false;
          subtitle = null;
          headerSubtitle = _("Not visible to other devices");
        }
      } else {
        subtitle = null;
        headerSubtitle = _("Packet not running");
      }

      this.checked = checked;
      this.subtitle = subtitle;
      this.menu.setHeader(this.gicon, this.title, headerSubtitle);
    }

    /**
     * @param {PacketApi} packetApi
     */
    setPacketApi(packetApi) {
      this._packetApi = packetApi;

      this._packetApi.connect(
        "g-properties-changed",
        (_proxy, _changed, _invalidated) => {
          this._updateHeader();
        },
      );
      this.connect("notify::checked", (_self, _a) => {
        this._packetApi.DeviceVisibility = this.checked;
      });
      this._updateHeader();
    }
  },
);

export const AppButton = GObject.registerClass(
  class AppButton extends St.Button {
    /**
     * @param {Assets} assets
     */
    constructor(assets) {
      super({
        style_class: "icon-button",
        can_focus: true,
        child: new St.Icon({
          gicon: assets.settings,
        }),
        accessible_name: _("Open settings"),
      });

      this.connect("clicked", () => {
        GLib.spawn_command_line_async(`flatpak run ${APP_ID}`);
      });
    }
  },
);

export const QuickShareIndicator = GObject.registerClass(
  class QuickShareIndicator extends QuickSettings.SystemIndicator {
    /** @type {St.Icon} */
    icon;

    /**
     * @param {Assets} assets
     */
    constructor(assets) {
      super();

      this.icon = this._addIndicator();
      this.icon.gicon = assets.quickShare;
    }
  },
);
