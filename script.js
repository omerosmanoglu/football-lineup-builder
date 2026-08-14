new Vue({
  el: "#app",
  data: function () {
    return {
      players: [],
      formations: {},
      selectedFormation: "4-2-3-1",
      selectedFederation: "TFF",
      fieldAssignments: [],
      benchAssignments: new Array(10).fill(null),
      federationAssignments: new Array(7).fill(null),
      nextPlayerId: 1,
      draggedContext: null,
      editingPlayerId: null,
      savePlacementName: "",
      savePlacementJson: "",
      loadPlacementJson: "",
      newPlayer: {
        name: "",
        positions: "",
        uyruk: "",
        deger: 0,
        dogumYil: new Date().getFullYear(),
        sakat: false,
        kadrodisi: false
      }
    };
  },
  computed: {
    formationNames: function () {
      return Object.keys(this.formations);
    },
    sortedSquadPlayers: function () {
      return this.players.slice().sort(function (a, b) {
        return Number(b.deger || 0) - Number(a.deger || 0);
      });
    },
    currentFormationSlots: function () {
      return this.formations[this.selectedFormation] || [];
    },
    first11NationalityCounts: function () {
      return this.groupNationalityCounts(this.fieldAssignments.filter(Boolean));
    },
    benchNationalityCounts: function () {
      return this.groupNationalityCounts(this.benchAssignments.filter(Boolean));
    },
    outNationalityCounts: function () {
      var outPlayers = this.players.filter(Boolean);

      var turkeyCount = 0;
      var foreignCount = 0;
      var self = this;

      outPlayers.forEach(function (player) {
        if (self.isTurkeyNationality(player.uyruk)) {
          turkeyCount += 1;
        } else {
          foreignCount += 1;
        }
      });

      return [
        { uyruk: "Yabancı", count: foreignCount, isTurkey: false, isForeignTotal: true },
        { uyruk: "Türkiye", count: turkeyCount, isTurkey: true, isForeignTotal: false }
      ];
    },
    first11Total: function () {
      return this.sumPlayers(this.fieldAssignments);
    },
    benchTotal: function () {
      return this.sumPlayers(this.benchAssignments);
    },
    outTotal: function () {
      return this.sumPlayers(this.players);
    },
    benchSize: function () {
      return this.selectedFederation === "TFF" ? 10 : 12;
    },
    federationSquadSize: function () {
      if (this.selectedFederation === "TFF") {
        return 7;
      } else {
        return 3;
      }
    },
    maxUEFAPlayers: function () {
      var allPlayers = this.fieldAssignments.filter(Boolean)
        .concat(this.benchAssignments.filter(Boolean))
        .concat(this.federationAssignments.filter(Boolean));
      
      var turkishCount = allPlayers.filter(function (p) {
        return this.isTurkeyNationality(p.uyruk);
      }, this).length;
      
      if (turkishCount >= 8) return 25;
      if (turkishCount === 7) return 24;
      if (turkishCount === 6) return 23;
      if (turkishCount === 5) return 22;
      if (turkishCount === 4) return 21;
      return 20;
    },
    federationTotal: function () {
      return this.sumPlayers(this.federationAssignments);
    },
    validationWarnings: function () {
      var warnings = [];
      var fieldPlayers = this.fieldAssignments.filter(Boolean);
      var benchPlayers = this.benchAssignments.filter(Boolean);
      var federationPlayers = this.federationAssignments.filter(Boolean);
      var allPlayers = fieldPlayers.concat(benchPlayers).concat(federationPlayers);
      
      var allTurkish = allPlayers.filter(function (p) {
        return this.isTurkeyNationality(p.uyruk);
      }, this).length;
      var allForeign = allPlayers.length - allTurkish;
      
      var first11Turkish = fieldPlayers.filter(function (p) {
        return this.isTurkeyNationality(p.uyruk);
      }, this).length;
      var first11Foreign = fieldPlayers.length - first11Turkish;
      
      var benchTurkish = benchPlayers.filter(function (p) {
        return this.isTurkeyNationality(p.uyruk);
      }, this).length;
      var benchForeign = benchPlayers.length - benchTurkish;
      
      if (this.selectedFederation === "TFF") {
        if (allTurkish + allForeign > 28) {
          warnings.push("Maximum 28 oyuncu olmalı (TFF)");
        }
        
        var gkCount = fieldPlayers.filter(function (p) {
          return p.positions.includes("Kaleci");
        }).length;
        if (gkCount > 3) {
          warnings.push("Maximum 3 Kaleci olmalı");
        }
        
        if (allTurkish < 14) {
          warnings.push("Minimum 14 Türk oyuncu olmalı (TFF)");
        }
        
        if (allForeign > 14) {
          warnings.push("Maximum 14 Yabancı oyuncu olmalı (TFF)");
        }
        
        if (allForeign > 10) {
          var youngForeignCount = this.countYoungForeignPlayers(allPlayers);
          if (youngForeignCount < 4) {
            warnings.push("10'dan fazla Yabancı varsa 4+ genç (2004+) olmalı");
          }
        }
      } else {
        var maxPlayers = this.maxUEFAPlayers;
        if (allPlayers.length > maxPlayers) {
          warnings.push("UEFA: Toplam maksimum " + maxPlayers + " oyuncu ("+allTurkish+" Türk için)");
        }
      }
      
      return warnings;
    },
    maxBirthYear: function () {
      return new Date().getFullYear();
    }
  },
  methods: {
    resetPlayerFormState: function () {
      this.editingPlayerId = null;
      this.newPlayer = {
        name: "",
        positions: "",
        uyruk: "",
        deger: 0,
        dogumYil: new Date().getFullYear(),
        sakat: false,
        kadrodisi: false
      };
    },

    prepareAddPlayer: function () {
      this.resetPlayerFormState();
    },

    openEditPlayer: function (player) {
      if (!player) {
        return;
      }

      this.editingPlayerId = player._id;
      this.newPlayer = {
        name: String(player.name || ""),
        positions: String(player.positions || ""),
        uyruk: String(player.uyruk || ""),
        deger: Number(player.deger || 0),
        dogumYil: Number(player.dogumYil || new Date().getFullYear()),
        sakat: Boolean(player.sakat),
        kadrodisi: Boolean(player.kadrodisi)
      };

      var modalElement = document.getElementById("addPlayerModal");
      var modal = bootstrap.Modal.getOrCreateInstance(modalElement);
      modal.show();
    },

    savePlayerForm: function () {
      var name = this.newPlayer.name.trim();
      var positions = this.newPlayer.positions.trim();
      var uyruk = this.newPlayer.uyruk.trim();
      var deger = Number(this.newPlayer.deger);
      var dogumYil = Number(this.newPlayer.dogumYil);
      var sakat = Boolean(this.newPlayer.sakat);
      var kadrodisi = Boolean(this.newPlayer.kadrodisi);

      if (!name || !positions || !uyruk || !Number.isFinite(deger) || deger < 0) {
        return;
      }

      if (this.editingPlayerId) {
        var editIndex = this.players.findIndex(function (p) {
          return p._id === this.editingPlayerId;
        }, this);

        if (editIndex !== -1) {
          this.$set(this.players, editIndex, Object.assign({}, this.players[editIndex], {
            name: name,
            positions: positions,
            uyruk: uyruk,
            deger: deger,
            dogumYil: dogumYil,
            sakat: sakat,
            kadrodisi: kadrodisi
          }));
          this.savePlayersToLocalStorage();
        }

        this.resetPlayerFormState();

        var editModalElement = document.getElementById("addPlayerModal");
        var editModal = bootstrap.Modal.getOrCreateInstance(editModalElement);
        editModal.hide();
        return;
      }

      this.addPlayer();
    },

    toExternalPlayer: function (player) {
      if (!player) {
        return null;
      }
      return {
        name: player.name,
        positions: player.positions,
        uyruk: player.uyruk,
        deger: Number(player.deger || 0),
        dogumYil: Number(player.dogumYil || new Date().getFullYear()),
        sakat: Boolean(player.sakat),
        kadrodisi: Boolean(player.kadrodisi)
      };
    },

    createInternalPlayer: function (rawPlayer, order) {
      if (!rawPlayer || typeof rawPlayer !== "object") {
        return null;
      }

      var value = Number(rawPlayer.deger);
      return {
        _id: this.nextPlayerId++,
        _order: order,
        name: String(rawPlayer.name || "").trim(),
        positions: String(rawPlayer.positions || "").trim(),
        uyruk: String(rawPlayer.uyruk || "-").trim() || "-",
        deger: Number.isFinite(value) ? value : 0,
        sakat: Boolean(rawPlayer.sakat),
        kadrodisi: Boolean(rawPlayer.kadrodisi)
      };
    },

    buildPlacementPayload: function () {
      return {
        formasyon: this.selectedFormation,
        kadro: this.players.map(this.toExternalPlayer),
        saha: this.fieldAssignments.map(this.toExternalPlayer),
        yedek: this.benchAssignments.map(this.toExternalPlayer)
      };
    },

    openSavePlacementModal: function () {
      this.savePlacementJson = JSON.stringify(this.buildPlacementPayload(), null, 2);
      var modalElement = document.getElementById("savePlacementModal");
      var modal = bootstrap.Modal.getOrCreateInstance(modalElement);
      modal.show();
    },

    openLoadPlacementModal: function () {
      this.loadPlacementJson = "";
      var modalElement = document.getElementById("loadPlacementModal");
      var modal = bootstrap.Modal.getOrCreateInstance(modalElement);
      modal.show();
    },

    loadPlacementFromJson: function () {
      var parsed;
      try {
        parsed = JSON.parse(this.loadPlacementJson);
      } catch (error) {
        alert("JSON formatı geçersiz.");
        return;
      }

      if (!parsed || typeof parsed !== "object") {
        alert("Yükleme verisi bulunamadı.");
        return;
      }

      if (typeof parsed.formasyon === "string" && this.formations[parsed.formasyon]) {
        this.selectedFormation = parsed.formasyon;
      }

      var slotCount = this.currentFormationSlots.length;
      var rawKadro = Array.isArray(parsed.kadro) ? parsed.kadro : [];
      var rawSaha = Array.isArray(parsed.saha) ? parsed.saha : [];
      var rawYedek = Array.isArray(parsed.yedek) ? parsed.yedek : [];

      this.nextPlayerId = 1;
      var order = 0;

      this.players = rawKadro
        .map(function (p) {
          return this.createInternalPlayer(p, order++);
        }, this)
        .filter(Boolean);

      this.fieldAssignments = new Array(slotCount).fill(null);
      for (var i = 0; i < slotCount; i += 1) {
        this.$set(this.fieldAssignments, i, this.createInternalPlayer(rawSaha[i], order++));
      }

      this.benchAssignments = new Array(7).fill(null);
      for (var j = 0; j < 7; j += 1) {
        this.$set(this.benchAssignments, j, this.createInternalPlayer(rawYedek[j], order++));
      }

      this.savePlayersToLocalStorage();

      var modalElement = document.getElementById("loadPlacementModal");
      var modal = bootstrap.Modal.getOrCreateInstance(modalElement);
      modal.hide();
    },

    isTurkeyNationality: function (value) {
      return String(value || "").toLocaleLowerCase("tr").includes("türkiye");
    },

    getSimplifiedNationality: function (uyruk) {
      if (!uyruk) return "Yabancı";
      if (this.isTurkeyNationality(uyruk)) {
        return "Türkiye";
      }
      return "Yabancı";
    },

    getStorageKey: function () {
      return "kadroPlayersV1";
    },

    normalizePlayerList: function (raw) {
      var self = this;
      this.nextPlayerId = 1;

      return raw.map(function (player, index) {
        var val = Number(player.deger);
        var dogumYil = Number(player.dogumYil);
        return {
          _id: self.nextPlayerId + index,
          _order: index,
          name: player.name,
          positions: player.positions,
          uyruk: player.uyruk,
          deger: Number.isFinite(val) ? val : 0,
          dogumYil: Number.isFinite(dogumYil) ? dogumYil : new Date().getFullYear(),
          sakat: Boolean(player.sakat),
          kadrodisi: Boolean(player.kadrodisi)
        };
      });
    },

    getAllKnownPlayers: function () {
      var map = {};
      var ordered = [];

      function pushUnique(player) {
        if (!player || map[player._id]) {
          return;
        }
        map[player._id] = true;
        ordered.push(player);
      }

      this.players.forEach(pushUnique);
      this.fieldAssignments.forEach(pushUnique);
      this.benchAssignments.forEach(pushUnique);
      this.federationAssignments.forEach(pushUnique);

      return ordered.sort(function (a, b) {
        return a._order - b._order;
      });
    },

    savePlayersToLocalStorage: function () {
      try {
        var toSave = this.getAllKnownPlayers().map(function (player) {
          return {
            name: player.name,
            positions: player.positions,
            uyruk: player.uyruk,
            deger: Number(player.deger || 0),
            dogumYil: Number(player.dogumYil || new Date().getFullYear()),
            sakat: Boolean(player.sakat),
            kadrodisi: Boolean(player.kadrodisi)
          };
        });
        localStorage.setItem(this.getStorageKey(), JSON.stringify(toSave));
      } catch (error) {
        console.error("localStorage yazma hatasi", error);
      }
    },

    fetchDefaultPlayersFromJson: async function () {
      var response = await fetch("oyuncu.json");
      if (!response.ok) {
        throw new Error("oyuncu.json okunamadi");
      }
      return await response.json();
    },

    resetAssignments: function () {
      this.fieldAssignments = this.currentFormationSlots.map(function () {
        return null;
      });
      this.benchAssignments = new Array(this.benchSize).fill(null);
      this.federationAssignments = new Array(this.federationSquadSize).fill(null);
      this.draggedContext = null;
    },

    resetPlayersFromDefault: async function () {
      try {
        var defaults = await this.fetchDefaultPlayersFromJson();
        this.players = this.normalizePlayerList(defaults);
        this.nextPlayerId = this.players.length + 1;
        this.resetAssignments();
        this.savePlayersToLocalStorage();
      } catch (error) {
        console.error(error);
      }
    },

    groupNationalityCounts: function (list) {
      var turkCount = 0;
      var foreignCount = 0;
      var self = this;

      list.forEach(function (player) {
        if (self.isTurkeyNationality(player.uyruk)) {
          turkCount += 1;
        } else {
          foreignCount += 1;
        }
      });

      var result = [];
      if (turkCount > 0) {
        result.push({
          uyruk: "Türkiye",
          count: turkCount,
          isTurkey: true,
          isForeignTotal: false
        });
      }
      if (foreignCount > 0) {
        result.push({
          uyruk: "Yabancı",
          count: foreignCount,
          isTurkey: false,
          isForeignTotal: true
        });
      }

      return result;
    },

    sumPlayers: function (list) {
      return list.reduce(function (total, player) {
        if (!player) {
          return total;
        }
        return total + Number(player.deger || 0);
      }, 0);
    },

    formatMoney: function (value) {
      return Number(value || 0).toFixed(2) + " M€";
    },

    parsePercent: function (value, fallbackMax) {
      if (typeof value === "string" && value.trim().endsWith("%")) {
        var parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) {
          return Math.min(100, Math.max(0, parsed));
        }
        return 0;
      }

      var numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return 0;
      }
      return Math.min(100, Math.max(0, (numeric / fallbackMax) * 100));
    },

    slotStyle: function (slot) {
      return {
        top: this.parsePercent(slot.top, 1100).toFixed(2) + "%",
        left: this.parsePercent(slot.left, 640).toFixed(2) + "%"
      };
    },

    startDragSlot: function (index, event) {
      if (!this.fieldAssignments[index]) {
        return;
      }
      this.draggedContext = { source: "layout-slot", index: Number(index) };
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/layout-slot-index", String(index));
    },

    resolveLayoutSlotIndex: function (event) {
      if (this.draggedContext && this.draggedContext.source === "layout-slot") {
        return Number(this.draggedContext.index);
      }

      if (!event || !event.dataTransfer) {
        return null;
      }

      var raw = event.dataTransfer.getData("text/layout-slot-index");
      if (typeof raw !== "string" || raw.trim() === "") {
        return null;
      }
      var index = Number(raw);
      return Number.isFinite(index) ? index : null;
    },

    updateSlotPosition: function (index, topPct, leftPct) {
      var slots = this.formations[this.selectedFormation] || [];
      if (!slots[index]) {
        return;
      }

      var safeTop = Math.min(100, Math.max(0, topPct));
      var safeLeft = Math.min(100, Math.max(0, leftPct));

      this.$set(slots, index, Object.assign({}, slots[index], {
        top: safeTop.toFixed(2) + "%",
        left: safeLeft.toFixed(2) + "%"
      }));
    },

    swapSlotPositions: function (firstIndex, secondIndex) {
      var slots = this.formations[this.selectedFormation] || [];
      if (!slots[firstIndex] || !slots[secondIndex]) {
        return;
      }

      var firstTop = this.parsePercent(slots[firstIndex].top, 1100);
      var firstLeft = this.parsePercent(slots[firstIndex].left, 640);
      var secondTop = this.parsePercent(slots[secondIndex].top, 1100);
      var secondLeft = this.parsePercent(slots[secondIndex].left, 640);

      this.updateSlotPosition(firstIndex, secondTop, secondLeft);
      this.updateSlotPosition(secondIndex, firstTop, firstLeft);
    },

    dropSlotOnPitch: function (event) {
      var slotIndex = this.resolveLayoutSlotIndex(event);
      if (!Number.isFinite(slotIndex)) {
        return;
      }

      var pitchRect = event.currentTarget.getBoundingClientRect();
      var topPct = ((event.clientY - pitchRect.top) / pitchRect.height) * 100;
      var leftPct = ((event.clientX - pitchRect.left) / pitchRect.width) * 100;

      this.updateSlotPosition(slotIndex, topPct, leftPct);
      this.clearDraggedContext();
    },

    startDragFromSquad: function (playerId, event) {
      var player = this.players.find(function (p) {
        return p._id === Number(playerId);
      });

      if (!player || player.sakat || player.kadrodisi) {
        event.preventDefault();
        return;
      }

      this.draggedContext = { source: "squad", playerId: Number(playerId) };
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/player-id", String(playerId));
    },

    startDragFromField: function (index, event) {
      var player = this.fieldAssignments[index];
      if (!player) {
        return;
      }
      this.draggedContext = { source: "field", index: index, playerId: Number(player._id) };
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/player-id", String(player._id));
    },

    startDragFromBench: function (index, event) {
      var player = this.benchAssignments[index];
      if (!player) {
        return;
      }
      this.draggedContext = { source: "bench", index: index, playerId: Number(player._id) };
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/player-id", String(player._id));
    },

    clearDraggedContext: function () {
      this.draggedContext = null;
    },

    resolveDraggedContext: function (event) {
      var current = this.getDraggedContext();
      if (current) {
        return current;
      }

      if (!event || !event.dataTransfer) {
        return null;
      }

      var rawId = event.dataTransfer.getData("text/player-id");
      if (typeof rawId !== "string" || rawId.trim() === "") {
        return null;
      }
      var playerId = Number(rawId);
      if (!Number.isFinite(playerId)) {
        return null;
      }

      var fieldIndex = this.fieldAssignments.findIndex(function (p) {
        return p && p._id === playerId;
      });
      if (fieldIndex !== -1) {
        return { source: "field", index: fieldIndex, playerId: playerId };
      }

      var benchIndex = this.benchAssignments.findIndex(function (p) {
        return p && p._id === playerId;
      });
      if (benchIndex !== -1) {
        return { source: "bench", index: benchIndex, playerId: playerId };
      }

      var federationIndex = this.federationAssignments.findIndex(function (p) {
        return p && p._id === playerId;
      });
      if (federationIndex !== -1) {
        return { source: "federation", index: federationIndex, playerId: playerId };
      }

      var inSquad = this.players.some(function (p) {
        return p && p._id === playerId;
      });
      if (inSquad) {
        return { source: "squad", playerId: playerId };
      }

      return null;
    },

    getDraggedContext: function () {
      if (this.draggedContext && Number.isFinite(this.draggedContext.playerId)) {
        return this.draggedContext;
      }
      return null;
    },

    takeDraggedPlayer: function () {
      var ctx = this.getDraggedContext();
      if (!ctx) {
        return { ctx: null, player: null };
      }

      if (ctx.source === "squad") {
        return { ctx: ctx, player: this.removeFromSquad(ctx.playerId) };
      }

      if (ctx.source === "field") {
        var fieldPlayer = this.fieldAssignments[ctx.index];
        this.$set(this.fieldAssignments, ctx.index, null);
        return { ctx: ctx, player: fieldPlayer || null };
      }

      if (ctx.source === "bench") {
        var benchPlayer = this.benchAssignments[ctx.index];
        this.$set(this.benchAssignments, ctx.index, null);
        return { ctx: ctx, player: benchPlayer || null };
      }

      if (ctx.source === "federation") {
        var federationPlayer = this.federationAssignments[ctx.index];
        this.$set(this.federationAssignments, ctx.index, null);
        return { ctx: ctx, player: federationPlayer || null };
      }

      return { ctx: null, player: null };
    },

    placeBackToSource: function (ctx, player) {
      if (!ctx || !player) {
        return;
      }

      if (ctx.source === "field") {
        this.$set(this.fieldAssignments, ctx.index, player);
        return;
      }

      if (ctx.source === "bench") {
        this.$set(this.benchAssignments, ctx.index, player);
        return;
      }

      if (ctx.source === "federation") {
        this.$set(this.federationAssignments, ctx.index, player);
        return;
      }

      this.addBackToSquad(player);
    },

    removeFromSquad: function (playerId) {
      var index = this.players.findIndex(function (p) {
        return p._id === playerId;
      });
      if (index === -1) {
        return null;
      }
      return this.players.splice(index, 1)[0];
    },

    addBackToSquad: function (player) {
      if (!player) {
        return;
      }

      var exists = this.players.some(function (p) {
        return p._id === player._id;
      });
      if (exists) {
        return;
      }

      this.players.push(player);
      this.players.sort(function (a, b) {
        return a._order - b._order;
      });
    },

    dropToField: function (index, event) {
      var layoutIndex = this.resolveLayoutSlotIndex(event);
      if (Number.isFinite(layoutIndex)) {
        if (layoutIndex !== index) {
          this.swapSlotPositions(layoutIndex, index);
        }
        this.clearDraggedContext();
        return;
      }

      var ctx = this.resolveDraggedContext(event);
      if (!ctx) {
        return;
      }

      this.draggedContext = ctx;

      if (ctx.source === "field" && ctx.index === index) {
        return;
      }

      var picked = this.takeDraggedPlayer();
      if (!picked.player) {
        this.clearDraggedContext();
        return;
      }

      var targetPlayer = this.fieldAssignments[index] || null;
      this.$set(this.fieldAssignments, index, picked.player);
      this.placeBackToSource(picked.ctx, targetPlayer);

      this.clearDraggedContext();
    },

    dropToBench: function (index, event) {
      var ctx = this.resolveDraggedContext(event);
      if (!ctx) {
        return;
      }

      this.draggedContext = ctx;

      if (ctx.source === "bench" && ctx.index === index) {
        return;
      }

      var picked = this.takeDraggedPlayer();
      if (!picked.player) {
        this.clearDraggedContext();
        return;
      }

      var targetPlayer = this.benchAssignments[index] || null;
      this.$set(this.benchAssignments, index, picked.player);
      this.placeBackToSource(picked.ctx, targetPlayer);

      this.clearDraggedContext();
    },

    removeFromField: function (index) {
      var player = this.fieldAssignments[index];
      if (!player) {
        return;
      }
      this.$set(this.fieldAssignments, index, null);
      this.addBackToSquad(player);
    },

    removeFromBench: function (index) {
      var player = this.benchAssignments[index];
      if (!player) {
        return;
      }
      this.$set(this.benchAssignments, index, null);
      this.addBackToSquad(player);
    },

    resetFieldForFormation: function () {
      var self = this;

      this.fieldAssignments.forEach(function (player) {
        if (player) {
          self.addBackToSquad(player);
        }
      });

      this.fieldAssignments = this.currentFormationSlots.map(function () {
        return null;
      });
    },

    onFormationChange: function () {
      this.resetFieldForFormation();
    },

    addPlayer: function () {
      var name = this.newPlayer.name.trim();
      var positions = this.newPlayer.positions.trim();
      var uyruk = this.newPlayer.uyruk.trim();
      var deger = Number(this.newPlayer.deger);
      var dogumYil = Number(this.newPlayer.dogumYil);
      var sakat = Boolean(this.newPlayer.sakat);
      var kadrodisi = Boolean(this.newPlayer.kadrodisi);

      if (!name || !positions || !uyruk || !Number.isFinite(deger) || deger < 0) {
        return;
      }

      var order =
        this.players.length +
        this.fieldAssignments.filter(Boolean).length +
        this.benchAssignments.filter(Boolean).length;

      this.players.push({
        _id: this.nextPlayerId,
        _order: order,
        name: name,
        positions: positions,
        uyruk: uyruk,
        deger: deger,
        dogumYil: dogumYil,
        sakat: sakat,
        kadrodisi: kadrodisi
      });
      this.nextPlayerId += 1;
      this.savePlayersToLocalStorage();

      this.newPlayer = {
        name: "",
        positions: "",
        uyruk: "",
        deger: 0,
        dogumYil: new Date().getFullYear(),
        sakat: false,
        kadrodisi: false
      };

      var modalElement = document.getElementById("addPlayerModal");
      var modal = bootstrap.Modal.getOrCreateInstance(modalElement);
      modal.hide();
    },

    loadPlayers: async function () {
      var raw = null;

      try {
        var cached = localStorage.getItem(this.getStorageKey());
        if (cached) {
          var parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            raw = parsed;
          }
        }
      } catch (error) {
        console.error("localStorage okuma hatasi", error);
      }

      if (!raw) {
        raw = await this.fetchDefaultPlayersFromJson();
        try {
          localStorage.setItem(this.getStorageKey(), JSON.stringify(raw));
        } catch (error) {
          console.error("localStorage ilk yazim hatasi", error);
        }
      }

      this.players = this.normalizePlayerList(raw);
      this.nextPlayerId = this.players.length + 1;
    },

    isYoungPlayer: function (player) {
      if (!player || !player.dogumYil) {
        return false;
      }
      return Number(player.dogumYil) >= 2004;
    },

    countYoungForeignPlayers: function (players) {
      var self = this;
      return players.filter(function (p) {
        return p && !self.isTurkeyNationality(p.uyruk) && self.isYoungPlayer(p);
      }).length;
    },

    onFederationChange: function () {
      this.benchAssignments = new Array(this.benchSize).fill(null);
      this.federationAssignments = new Array(this.federationSquadSize).fill(null);
    },

    startDragFromFederation: function (index, event) {
      var player = this.federationAssignments[index];
      if (!player) {
        event.preventDefault();
        return;
      }
      this.draggedContext = { source: "federation", index: index, playerId: Number(player._id) };
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/player-id", String(player._id));
    },

    dropToFederation: function (index, event) {
      var ctx = this.resolveDraggedContext(event);
      if (!ctx) {
        return;
      }

      this.draggedContext = ctx;

      if (ctx.source === "federation" && ctx.index === index) {
        return;
      }

      var picked = this.takeDraggedPlayer();
      if (!picked.player) {
        this.clearDraggedContext();
        return;
      }

      var targetPlayer = this.federationAssignments[index] || null;
      this.$set(this.federationAssignments, index, picked.player);
      this.placeBackToSource(picked.ctx, targetPlayer);

      this.clearDraggedContext();
    },

    removeFromFederation: function (index) {
      var player = this.federationAssignments[index];
      if (player) {
        this.$set(this.federationAssignments, index, null);
        this.savePlayersToLocalStorage();
      }
    },

    loadFormations: async function () {
      var response = await fetch("formasyon.json");
      if (!response.ok) {
        throw new Error("formasyon.json okunamadi");
      }

      this.formations = await response.json();

      if (!this.formationNames.includes(this.selectedFormation)) {
        this.selectedFormation = this.formationNames.length > 0 ? this.formationNames[0] : "";
      }

      this.resetFieldForFormation();
    }
  },
  created: async function () {
    try {
      await Promise.all([this.loadPlayers(), this.loadFormations()]);
    } catch (error) {
      // Keep behavior simple and visible in console for local static hosting.
      console.error(error);
    }
  }
});
