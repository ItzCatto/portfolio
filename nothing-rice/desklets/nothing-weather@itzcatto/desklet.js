const Desklet = imports.ui.desklet;
const St = imports.gi.St;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const GLib = imports.gi.GLib;
const ByteArray = imports.byteArray;

// ---- edit this to your city ----
const CITY = "Villupuram";
// ---------------------------------

function _run(cmd) {
    try {
        let [ok, out, err, status] = GLib.spawn_command_line_sync(cmd);
        if (ok && out && out.length) return ByteArray.toString(out).trim();
    } catch (e) { /* ignore */ }
    return "";
}

function NothingWeatherDesklet(metadata, desklet_id) {
    this._init(metadata, desklet_id);
}

NothingWeatherDesklet.prototype = {
    __proto__: Desklet.Desklet.prototype,

    _init: function (metadata, desklet_id) {
        Desklet.Desklet.prototype._init.call(this, metadata, desklet_id);

        this.window = new St.BoxLayout({ vertical: true, style_class: "nothing-weather-card" });
        this.setContent(this.window);

        let top = new St.BoxLayout({ vertical: false, style_class: "nothing-weather-top" });
        this.tempLabel = new St.Label({ text: "--°", style_class: "nothing-weather-temp" });
        this.iconLabel = new St.Label({ text: "☁", style_class: "nothing-weather-icon" });
        top.add(this.tempLabel);
        top.add(this.iconLabel);
        this.window.add(top);

        this.condLabel = new St.Label({ text: "Cargando...", style_class: "nothing-weather-cond" });
        this.window.add(this.condLabel);

        this.cityLabel = new St.Label({ text: CITY, style_class: "nothing-weather-city" });
        this.window.add(this.cityLabel);

        this._update();
        // refresh every 15 minutes, curl is capped at 5s so it can't hang the desklet for long
        this._loop = Mainloop.timeout_add_seconds(900, Lang.bind(this, function () {
            this._update();
            return true;
        }));
    },

    _update: function () {
        let raw = _run("curl -s --max-time 5 \"wttr.in/" + CITY + "?format=%t|%C\"");
        if (!raw || raw.indexOf("|") === -1) {
            this.condLabel.set_text("Sin datos");
            return;
        }
        let parts = raw.split("|");
        let temp = parts[0].replace("+", "").trim();
        let cond = parts[1].trim();
        this.tempLabel.set_text(temp);
        this.condLabel.set_text(cond);
        this.iconLabel.set_text(this._iconFor(cond));
    },

    _iconFor: function (cond) {
        let c = cond.toLowerCase();
        if (c.indexOf("rain") !== -1 || c.indexOf("drizzle") !== -1) return "🌧";
        if (c.indexOf("snow") !== -1) return "❄";
        if (c.indexOf("thunder") !== -1) return "⛈";
        if (c.indexOf("cloud") !== -1 || c.indexOf("overcast") !== -1) return "☁";
        if (c.indexOf("clear") !== -1 || c.indexOf("sun") !== -1) return "☀";
        if (c.indexOf("fog") !== -1 || c.indexOf("mist") !== -1) return "🌫";
        return "☁";
    },

    on_desklet_removed: function () {
        if (this._loop) Mainloop.source_remove(this._loop);
    }
};

function main(metadata, desklet_id) {
    return new NothingWeatherDesklet(metadata, desklet_id);
}
