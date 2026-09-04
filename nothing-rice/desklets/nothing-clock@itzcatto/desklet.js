const Desklet = imports.ui.desklet;
const St = imports.gi.St;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const GLib = imports.gi.GLib;

function NothingClockDesklet(metadata, desklet_id) {
    this._init(metadata, desklet_id);
}

NothingClockDesklet.prototype = {
    __proto__: Desklet.Desklet.prototype,

    _init: function (metadata, desklet_id) {
        Desklet.Desklet.prototype._init.call(this, metadata, desklet_id);

        this.window = new St.BoxLayout({ vertical: true, style_class: "nothing-clock-card" });
        this.setContent(this.window);

        this.timeLabel = new St.Label({ text: "--:--", style_class: "nothing-clock-time" });
        this.window.add(this.timeLabel);

        this._update();
        this._loop = Mainloop.timeout_add_seconds(1, Lang.bind(this, function () {
            this._update();
            return true;
        }));
    },

    _update: function () {
        let now = GLib.DateTime.new_now_local();
        this.timeLabel.set_text(now.format("%H : %M"));
    },

    on_desklet_removed: function () {
        if (this._loop) Mainloop.source_remove(this._loop);
    }
};

function main(metadata, desklet_id) {
    return new NothingClockDesklet(metadata, desklet_id);
}
