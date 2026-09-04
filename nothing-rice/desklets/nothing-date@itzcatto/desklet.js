const Desklet = imports.ui.desklet;
const St = imports.gi.St;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const GLib = imports.gi.GLib;
const Util = imports.misc.util;

function NothingDateDesklet(metadata, desklet_id) {
    this._init(metadata, desklet_id);
}

NothingDateDesklet.prototype = {
    __proto__: Desklet.Desklet.prototype,

    _init: function (metadata, desklet_id) {
        Desklet.Desklet.prototype._init.call(this, metadata, desklet_id);

        this.button = new St.Button({ reactive: true, style_class: "nothing-date-card" });
        this.setContent(this.button);

        this.box = new St.BoxLayout({ vertical: true });
        this.button.set_child(this.box);

        this.dayName = new St.Label({ text: "---", style_class: "nothing-date-dayname" });
        this.dayNum = new St.Label({ text: "--", style_class: "nothing-date-daynum" });
        this.box.add(this.dayName);
        this.box.add(this.dayNum);

        this.button.connect("clicked", function () {
            Util.spawnCommandLine("xdg-open https://calendar.google.com");
        });

        this._update();
        this._loop = Mainloop.timeout_add_seconds(60, Lang.bind(this, function () {
            this._update();
            return true;
        }));
    },

    _update: function () {
        let now = GLib.DateTime.new_now_local();
        this.dayName.set_text(now.format("%a").toUpperCase());
        this.dayNum.set_text(now.format("%d"));
    },

    on_desklet_removed: function () {
        if (this._loop) Mainloop.source_remove(this._loop);
    }
};

function main(metadata, desklet_id) {
    return new NothingDateDesklet(metadata, desklet_id);
}
