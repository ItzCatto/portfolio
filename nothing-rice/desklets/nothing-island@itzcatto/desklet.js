const Desklet = imports.ui.desklet;
const St = imports.gi.St;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const GLib = imports.gi.GLib;
const ByteArray = imports.byteArray;
let Tweener = null;
try { Tweener = imports.ui.tweener; } catch (e) { Tweener = null; }

// ---- edit these to taste ----
const CAFE_GSETTINGS_KEY = "org.cinnamon.desktop.notifications display-notifications";
// ------------------------------

function _run(cmd) {
    try {
        let [ok, out, err, status] = GLib.spawn_command_line_sync(cmd);
        if (ok && out && out.length) return ByteArray.toString(out).trim();
    } catch (e) { /* tool not installed, ignore */ }
    return "";
}

function NothingIslandDesklet(metadata, desklet_id) {
    this._init(metadata, desklet_id);
}

NothingIslandDesklet.prototype = {
    __proto__: Desklet.Desklet.prototype,

    _init: function (metadata, desklet_id) {
        Desklet.Desklet.prototype._init.call(this, metadata, desklet_id);

        this._expanded = false;
        this._dnd = false;
        this._prevCpu = null;
        this._spinAngle = 0;

        this._buildUI();

        this._updateTime();
        this._updateStatus();

        this._timeLoop = Mainloop.timeout_add_seconds(1, Lang.bind(this, function () {
            this._updateTime();
            return true;
        }));
        this._statusLoop = Mainloop.timeout_add_seconds(3, Lang.bind(this, function () {
            this._updateStatus();
            return true;
        }));
    },

    _buildUI: function () {
        this.window = new St.BoxLayout({ vertical: true, style_class: "nothing-island" });
        this.setContent(this.window);

        // ---- collapsed pill ----
        this.pillButton = new St.Button({ reactive: true, style_class: "nothing-pill" });
        this.pillRow = new St.BoxLayout({ vertical: false, style_class: "nothing-pill-row" });
        this.pillButton.set_child(this.pillRow);

        this.pillTime = new St.Label({ text: "--:--", style_class: "nothing-pill-time" });
        this.pillIcons = new St.BoxLayout({ vertical: false, style_class: "nothing-pill-icons" });
        this.pillWifi = new St.Icon({ icon_name: "network-wireless-symbolic", icon_size: 14, style_class: "nothing-pill-icon" });
        this.pillVol = new St.Icon({ icon_name: "audio-volume-high-symbolic", icon_size: 14, style_class: "nothing-pill-icon" });
        this.pillBatt = new St.Label({ text: "", style_class: "nothing-pill-batt" });
        this.pillIcons.add(this.pillWifi);
        this.pillIcons.add(this.pillVol);
        this.pillIcons.add(this.pillBatt);

        this.pillRow.add(this.pillIcons);
        this.pillRow.add(this.pillTime);

        this.pillButton.connect("clicked", Lang.bind(this, this._toggleExpanded));
        this.window.add(this.pillButton);

        // ---- expanded body ----
        this.body = new St.BoxLayout({ vertical: true, style_class: "nothing-body" });
        this.body.hide();
        this.window.add(this.body);

        // header: big time + date
        let header = new St.BoxLayout({ vertical: true, style_class: "nothing-header" });
        this.bigTime = new St.Label({ text: "--:--", style_class: "nothing-big-time" });
        this.bigDate = new St.Label({ text: "", style_class: "nothing-big-date" });
        header.add(this.bigTime);
        header.add(this.bigDate);
        this.body.add(header);

        // connectivity row
        let connRow = new St.BoxLayout({ vertical: false, style_class: "nothing-row" });
        this.netCard = this._pillLabel("network-wireless-symbolic", "Sin red");
        this.btCard = this._pillLabel("bluetooth-active-symbolic", "Sin dispositivo");
        connRow.add(this.netCard.box);
        connRow.add(this.btCard.box);
        this.body.add(connRow);

        // volume row
        let volRow = new St.BoxLayout({ vertical: false, style_class: "nothing-row nothing-vol-row" });
        let volIcon = new St.Icon({ icon_name: "audio-volume-high-symbolic", icon_size: 16, style_class: "nothing-icon" });
        this.volTrack = new St.Widget({ style_class: "nothing-bar-track" });
        this.volFill = new St.Widget({ style_class: "nothing-bar-fill" });
        this.volTrack.add_actor(this.volFill);
        volRow.add(volIcon);
        volRow.add(this.volTrack, { expand: true });
        this.body.add(volRow);

        // media card
        let mediaCard = new St.BoxLayout({ vertical: false, style_class: "nothing-media-card" });
        this.mediaArt = new St.Icon({ icon_name: "audio-x-generic-symbolic", icon_size: 28, style_class: "nothing-media-art" });
        let mediaInfo = new St.BoxLayout({ vertical: true, style_class: "nothing-media-info" });
        this.mediaTitle = new St.Label({ text: "Nada sonando", style_class: "nothing-media-title" });
        this.mediaArtist = new St.Label({ text: "", style_class: "nothing-media-artist" });
        this.mediaProgTrack = new St.Widget({ style_class: "nothing-bar-track nothing-prog-track" });
        this.mediaProgFill = new St.Widget({ style_class: "nothing-bar-fill" });
        this.mediaProgTrack.add_actor(this.mediaProgFill);
        mediaInfo.add(this.mediaTitle);
        mediaInfo.add(this.mediaArtist);
        mediaInfo.add(this.mediaProgTrack);

        let mediaBtns = new St.BoxLayout({ vertical: false, style_class: "nothing-media-btns" });
        this.btnPrev = new St.Button({ style_class: "nothing-media-btn", label: "⏮" });
        this.btnPlay = new St.Button({ style_class: "nothing-media-btn", label: "⏯" });
        this.btnNext = new St.Button({ style_class: "nothing-media-btn", label: "⏭" });
        this.btnPrev.connect("clicked", function () { _run("playerctl previous"); });
        this.btnPlay.connect("clicked", function () { _run("playerctl play-pause"); });
        this.btnNext.connect("clicked", function () { _run("playerctl next"); });
        mediaBtns.add(this.btnPrev);
        mediaBtns.add(this.btnPlay);
        mediaBtns.add(this.btnNext);

        mediaCard.add(this.mediaArt);
        mediaCard.add(mediaInfo, { expand: true });
        this.body.add(mediaCard);
        this.body.add(mediaBtns);

        // stats row
        let statsRow = new St.BoxLayout({ vertical: false, style_class: "nothing-row nothing-stats-row" });
        this.cpuStat = this._statChip("CPU", "0%");
        this.ramStat = this._statChip("RAM", "0%");
        this.tempStat = this._statChip("TEMP", "--°");
        statsRow.add(this.cpuStat.box);
        statsRow.add(this.ramStat.box);
        statsRow.add(this.tempStat.box);
        this.body.add(statsRow);

        // footer: cafe mode toggle
        let footer = new St.BoxLayout({ vertical: false, style_class: "nothing-footer" });
        this.cafeButton = new St.Button({ style_class: "nothing-toggle", label: "MODO CAFÉ" });
        this.cafeButton.connect("clicked", Lang.bind(this, this._toggleCafe));
        footer.add(this.cafeButton, { expand: true });
        this.body.add(footer);
    },

    _pillLabel: function (iconName, defaultText) {
        let box = new St.BoxLayout({ vertical: false, style_class: "nothing-chip" });
        let icon = new St.Icon({ icon_name: iconName, icon_size: 14, style_class: "nothing-icon" });
        let label = new St.Label({ text: defaultText, style_class: "nothing-chip-label" });
        box.add(icon);
        box.add(label);
        return { box: box, label: label };
    },

    _statChip: function (name, value) {
        let box = new St.BoxLayout({ vertical: true, style_class: "nothing-stat-chip" });
        let nameLabel = new St.Label({ text: name, style_class: "nothing-stat-name" });
        let valueLabel = new St.Label({ text: value, style_class: "nothing-stat-value" });
        box.add(nameLabel);
        box.add(valueLabel);
        return { box: box, label: valueLabel };
    },

    _toggleExpanded: function () {
        this._expanded = !this._expanded;
        if (this._expanded) {
            this.body.show();
            this.body.set_opacity(0);
            if (Tweener) {
                Tweener.addTween(this.body, { opacity: 255, time: 0.18, transition: "easeOutQuad" });
            } else {
                this.body.set_opacity(255);
            }
            this._updateStatus();
        } else {
            if (Tweener) {
                Tweener.addTween(this.body, {
                    opacity: 0, time: 0.15, transition: "easeInQuad",
                    onComplete: Lang.bind(this, function () { this.body.hide(); })
                });
            } else {
                this.body.hide();
            }
        }
    },

    _toggleCafe: function () {
        this._dnd = !this._dnd;
        _run("gsettings set " + CAFE_GSETTINGS_KEY + " " + (this._dnd ? "false" : "true"));
        this.cafeButton.set_style_class_name(this._dnd ? "nothing-toggle nothing-toggle-on" : "nothing-toggle");
    },

    _updateTime: function () {
        let now = GLib.DateTime.new_now_local();
        let hhmm = now.format("%H:%M");
        this.pillTime.set_text(hhmm);
        this.bigTime.set_text(hhmm + ":" + now.format("%S"));
        this.bigDate.set_text(now.format("%A, %d %B"));
    },

    _updateStatus: function () {
        // battery
        let batt = _run("bash -c \"cat /sys/class/power_supply/BAT*/capacity 2>/dev/null | head -1\"");
        this.pillBatt.set_text(batt ? (batt + "%") : "");

        if (!this._expanded) return; // save cycles: skip the heavy stuff while collapsed

        // network
        let wifi = _run("bash -c \"nmcli -t -f active,ssid dev wifi 2>/dev/null | grep '^yes' | cut -d: -f2\"");
        if (!wifi) {
            let eth = _run("bash -c \"nmcli -t -f type,state dev 2>/dev/null | grep '^ethernet:connected'\"");
            wifi = eth ? "Ethernet" : "Sin red";
        }
        this.netCard.label.set_text(wifi);

        // bluetooth
        let bt = _run("bash -c \"bluetoothctl devices Connected 2>/dev/null | head -1 | cut -d' ' -f3-\"");
        this.btCard.label.set_text(bt || "Sin dispositivo");

        // volume
        let volRaw = _run("bash -c \"pactl get-sink-volume @DEFAULT_SINK@ 2>/dev/null | head -1\"");
        let volMatch = volRaw.match(/(\d+)%/);
        let vol = volMatch ? parseInt(volMatch[1]) : 0;
        this.volFill.set_style("width: " + Math.min(vol, 100) + "%;");

        // media
        let status = _run("playerctl status 2>/dev/null");
        if (status) {
            let title = _run("playerctl metadata title 2>/dev/null") || "Sin título";
            let artist = _run("playerctl metadata artist 2>/dev/null") || "";
            this.mediaTitle.set_text(title);
            this.mediaArtist.set_text(artist);
            this.btnPlay.set_label(status === "Playing" ? "⏸" : "▶");

            let posRaw = _run("playerctl position 2>/dev/null");
            let lenRaw = _run("playerctl metadata mpris:length 2>/dev/null");
            let pos = parseFloat(posRaw) || 0;
            let len = (parseFloat(lenRaw) || 0) / 1000000;
            let pct = len > 0 ? Math.min(100, (pos / len) * 100) : 0;
            this.mediaProgFill.set_style("width: " + pct + "%;");
        } else {
            this.mediaTitle.set_text("Nada sonando");
            this.mediaArtist.set_text("");
            this.btnPlay.set_label("▶");
            this.mediaProgFill.set_style("width: 0%;");
        }

        // cpu
        let stat = _run("bash -c \"head -1 /proc/stat\"");
        let parts = stat.split(/\s+/).slice(1).map(Number);
        if (parts.length >= 4) {
            let idle = parts[3] + (parts[4] || 0);
            let total = parts.reduce(function (a, b) { return a + b; }, 0);
            if (this._prevCpu) {
                let dIdle = idle - this._prevCpu.idle;
                let dTotal = total - this._prevCpu.total;
                let usage = dTotal > 0 ? Math.round(100 * (1 - dIdle / dTotal)) : 0;
                this.cpuStat.label.set_text(usage + "%");
            }
            this._prevCpu = { idle: idle, total: total };
        }

        // ram
        let mem = _run("bash -c \"cat /proc/meminfo\"");
        let totalMatch = mem.match(/MemTotal:\s+(\d+)/);
        let availMatch = mem.match(/MemAvailable:\s+(\d+)/);
        if (totalMatch && availMatch) {
            let total = parseInt(totalMatch[1]);
            let avail = parseInt(availMatch[1]);
            let usedPct = Math.round(100 * (1 - avail / total));
            this.ramStat.label.set_text(usedPct + "%");
        }

        // temp (best effort)
        let temp = _run("bash -c \"sensors 2>/dev/null | grep -m1 -E 'Package id 0|Tctl|Composite' | grep -oE '[0-9]+\\.[0-9]+' | head -1\"");
        if (!temp) {
            let raw = _run("bash -c \"cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null\"");
            if (raw) temp = (parseInt(raw) / 1000).toFixed(1);
        }
        this.tempStat.label.set_text(temp ? (Math.round(parseFloat(temp)) + "°") : "--°");
    },

    on_desklet_removed: function () {
        if (this._timeLoop) Mainloop.source_remove(this._timeLoop);
        if (this._statusLoop) Mainloop.source_remove(this._statusLoop);
    }
};

function main(metadata, desklet_id) {
    return new NothingIslandDesklet(metadata, desklet_id);
}
