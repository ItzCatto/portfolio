const Desklet = imports.ui.desklet;
const St = imports.gi.St;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const GLib = imports.gi.GLib;
const ByteArray = imports.byteArray;

function _run(cmd) {
    try {
        let [ok, out, err, status] = GLib.spawn_command_line_sync(cmd);
        if (ok && out && out.length) return ByteArray.toString(out).trim();
    } catch (e) { /* ignore */ }
    return "";
}

function NothingMediaDesklet(metadata, desklet_id) {
    this._init(metadata, desklet_id);
}

NothingMediaDesklet.prototype = {
    __proto__: Desklet.Desklet.prototype,

    _init: function (metadata, desklet_id) {
        Desklet.Desklet.prototype._init.call(this, metadata, desklet_id);

        this._spinning = false;
        this._spinLoop = null;

        this.window = new St.BoxLayout({ vertical: false, style_class: "nothing-media-widget" });
        this.setContent(this.window);

        this.vinyl = new St.Icon({ icon_name: "media-optical-symbolic", icon_size: 48, style_class: "nothing-vinyl" });
        this.window.add(this.vinyl);

        let info = new St.BoxLayout({ vertical: true, style_class: "nothing-media-widget-info" });
        this.title = new St.Label({ text: "Nada sonando", style_class: "nothing-media-widget-title" });
        this.artist = new St.Label({ text: "", style_class: "nothing-media-widget-artist" });

        let btns = new St.BoxLayout({ vertical: false, style_class: "nothing-media-widget-btns" });
        this.btnPrev = new St.Button({ style_class: "nothing-media-widget-btn", label: "⏮" });
        this.btnPlay = new St.Button({ style_class: "nothing-media-widget-btn", label: "▶" });
        this.btnNext = new St.Button({ style_class: "nothing-media-widget-btn", label: "⏭" });
        this.btnPrev.connect("clicked", function () { _run("playerctl previous"); });
        this.btnPlay.connect("clicked", function () { _run("playerctl play-pause"); });
        this.btnNext.connect("clicked", function () { _run("playerctl next"); });
        btns.add(this.btnPrev);
        btns.add(this.btnPlay);
        btns.add(this.btnNext);

        info.add(this.title);
        info.add(this.artist);
        info.add(btns);
        this.window.add(info, { expand: true });

        this._update();
        this._loop = Mainloop.timeout_add_seconds(2, Lang.bind(this, function () {
            this._update();
            return true;
        }));
    },

    _update: function () {
        let status = _run("playerctl status 2>/dev/null");
        if (status) {
            this.title.set_text(_run("playerctl metadata title 2>/dev/null") || "Sin título");
            this.artist.set_text(_run("playerctl metadata artist 2>/dev/null") || "");
            this.btnPlay.set_label(status === "Playing" ? "⏸" : "▶");
            this._setSpinning(status === "Playing");
        } else {
            this.title.set_text("Nada sonando");
            this.artist.set_text("");
            this.btnPlay.set_label("▶");
            this._setSpinning(false);
        }
    },

    _setSpinning: function (spin) {
        if (spin === this._spinning) return;
        this._spinning = spin;
        if (spin) {
            this._spinLoop = Mainloop.timeout_add(100, Lang.bind(this, function () {
                this.vinyl.rotation_angle_z = (this.vinyl.rotation_angle_z || 0) + 4;
                return true;
            }));
        } else if (this._spinLoop) {
            Mainloop.source_remove(this._spinLoop);
            this._spinLoop = null;
        }
    },

    on_desklet_removed: function () {
        if (this._loop) Mainloop.source_remove(this._loop);
        if (this._spinLoop) Mainloop.source_remove(this._spinLoop);
        this._spinning = false;
    }
};

function main(metadata, desklet_id) {
    return new NothingMediaDesklet(metadata, desklet_id);
}
