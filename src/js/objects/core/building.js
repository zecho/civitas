/**
 * Main Game building object.
 * 
 * @param {Object} params
 * @class {civitas.objects.building}
 * @returns {civitas.objects.building}
 */
civitas.objects.building = function(params) {

	/**
	 * The level of this building.
	 * 
	 * @type {Number}
	 * @private
	 */
	this.level = 1;

	/**
	 * Pointer to the settlement this building is located in.
	 * 
	 * @type {civitas.objects.settlement}
	 * @private
	 */
	this.settlement = null;

	/**
	 * The name of this building.
	 * 
	 * @type {String}
	 * @private
	 */
	this.name = null;

	/**
	 * The type of this building.
	 * 
	 * @type {String}
	 * @private
	 */
	this.type = null;

	/**
	 * Check if this building producing goods.
	 * 
	 * @type {Boolean}
	 * @private
	 */
	this.working = true;

	/**
	 * Check if this is a production building.
	 * 
	 * @type {Boolean}
	 * @private
	 */
	this.is_production = false;

	/**
	 * Check if this is a municipal building.
	 * 
	 * @type {Boolean}
	 * @private
	 */
	this.is_municipal = false;

	/**
	 * Check if this is a housing building.
	 * 
	 * @type {Boolean}
	 * @private
	 */
	this.is_housing = false;

	/**
	 * The DOM handle of this building.
	 *
	 * @type {String}
	 * @private
	 */
	this.handle = null;

	/**
	 * Flag if this building has any problems producing its goods.
	 *
	 * @type {Boolean}
	 * @private
	 */
	this.problems = false;

	/**
	 * Object constructor.
	 * 
	 * @private
	 * @returns {civitas.objects.building}
	 * @param {Object} params
	 */
	this.__init = function(params) {
		var self = this;
		this.settlement = params.settlement;
		this.type = params.type;
		this.name = params.data.name;
		this.is_production = (typeof params.data.is_production !== 'undefined' && params.data.is_production === true) ? true : false;
		this.is_municipal = (typeof params.data.is_municipal !== 'undefined' && params.data.is_municipal === true) ? true : false;
		this.is_housing = (typeof params.data.is_housing !== 'undefined' && params.data.is_housing === true) ? true : false;
		this.level = (typeof params.data.level !== 'undefined') ? params.data.level : 1;
		this.working = (typeof params.working !== 'undefined') ? params.working : true;
		this.handle = params.data.handle;
		params.data.level = this.get_level();
		if (params.hidden !== true) {
			$('section.game').append(civitas.ui.building_element(params)).on('click', '#building-' + this.get_handle(), function() {
				var panel = civitas['PANEL_' + self.get_handle().toUpperCase()];
				if (typeof panel !== 'undefined') {
					self.get_core().open_panel(panel, params.data);
				} else {
					self.get_core().open_panel(civitas.PANEL_BUILDING, params.data);
				}
				return false;
			});
		}
		var building = this.get_building_data();
		switch (this.get_type()) {
			case 'marketplace':
			case 'warehouse':
				this.get_settlement().storage = this.get_settlement().storage + (building.storage * this.get_level());
				break;
		}
		if (params.hidden !== true) {
			if (this.working === false) {
				this.problems = true;
				this.notify(civitas.NOTIFICATION_PRODUCTION_PAUSED);
			} else {
				this.problems = false;
				$('#building-' + this.get_handle()).empty();
			}
			this.get_core().refresh();
		}
		return this;
	};

	/**
	 * Check if the building can be upgraded.
	 *
	 * @returns {Boolean}
	 * @public
	 */
	this.is_upgradable = function() {
		var building = this.get_building_data();
		if (this.get_level() < building.levels) {
			return true;
		}
		return false;
	};

	/**
	 * Upgrade this building.
	 * 
	 * @public
	 * @returns {Boolean}
	 */
	this.upgrade = function() {
		var self = this;
		var settlement = this.get_settlement();
		var resources = settlement.get_resources();
		var next_level = this.get_level() + 1;
		var _b = civitas.BUILDINGS.findIndexM(this.get_type());
		if (_b !== false) {
			var _c = civitas.BUILDINGS[_b];
			if (this.is_upgradable() === true) {
				var bl_id = settlement.buildings_list.findIndexM(this.get_type());
				if (bl_id !== false) {
					for (var item in _c.cost) {
						if ((settlement.get_resources()[item] - (_c.cost[item] * next_level)) < 0) {
							this.get_core().error('You don`t have enough ' + item + ' to upgrade this building.');
							return false;
						}
					}
					for (var item in _c.cost) {
						if ((settlement.get_resources()[item] - (_c.cost[item] * next_level)) >= 0) {
							settlement.get_resources()[item] = settlement.get_resources()[item] - (_c.cost[item] * next_level);
						}
					}
					++this.level;
					var building_image = self.get_type();
					if (self.get_type().slice(0, -1) === 'house') {
						building_image = self.get_type().slice(0, -1);
					}
					var image = (typeof _c.visible_upgrades === 'undefined' || _c.visible_upgrades === false) ? building_image + '1' : building_image + self.get_level();
					$('section.game .building[data-type=' + this.get_type() + ']').css({
						'background-image': 'url(./images/buildings/' + image + '.png)'
					});
					if (typeof _c.storage !== 'undefined') {
						this.get_settlement().storage = this.get_settlement().storage + _c.storage;
					}
					this.get_settlement().buildings_list[bl_id].level = this.get_level();
					this.get_core().save_and_refresh();
					this.get_core().notify(this.get_name() + ' upgraded to level ' + this.get_level());
					return true;
				}
			}
		}
		return false;
	};

	/**
	 * Downgrade this building.
	 * 
	 * @public
	 * @returns {Boolean}
	 */
	this.downgrade = function() {
		if (this.get_level() > 1) {
			var bl_id = this.get_settlement().buildings_list.findIndexM(this.get_type());
			if (bl_id !== false) {
				--this.level;
				this.get_settlement().buildings_list[bl_id].level = this.get_level();
				this.get_core().save_and_refresh();
				this.get_core().notify(this.get_name() + ' downgraded to level ' + this.get_level());
				return true;
			}
		}
		return false;
	};

	/**
	 * Check if this building is a housing building.
	 * 
	 * @public
	 * @returns {Boolean}
	 */
	this.is_housing_building = function() {
		return this.is_housing;
	};

	/**
	 * Check if this building is a municipal building.
	 * 
	 * @public
	 * @returns {Boolean}
	 */
	this.is_municipal_building = function() {
		return this.is_municipal;
	};

	/**
	 * Check if this building is a production building (its production can be
	 * started and stopped).
	 * 
	 * @public
	 * @returns {Boolean}
	 */
	this.is_production_building = function() {
		return this.is_production;
	};

	/**
	 * Check if this building's production is started or stopped.
	 * 
	 * @public
	 * @returns {Boolean}
	 */
	this.is_producing = function() {
		return this.working;
	};

	/**
	 * Start this building's production
	 * 
	 * @public
	 * @returns {Boolean}
	 */
	this.start_production = function() {
		var bl_id = this.get_settlement().buildings_list.findIndexM(this.get_type());
		if (bl_id !== false) {
			if (this.is_production_building()) {
				this.get_core().notify(this.get_name() + '`s production started.');
				this.get_settlement().buildings_list[bl_id].working = true;
				this.working = true;
				this.problems = false;
				this.get_core().save_and_refresh();
				$('#building-' + this.get_handle()).empty();
				return true;
			}
		}
		return false;
	};

	/**
	 * Stop this building's production
	 * 
	 * @public
	 * @returns {Boolean}
	 */
	this.stop_production = function() {
		var bl_id = this.get_settlement().buildings_list.findIndexM(this.get_type());
		if (bl_id !== false) {
			if (this.is_production_building()) {
				this.get_core().notify(this.get_name() + '`s production stopped.');
				this.get_settlement().buildings_list[bl_id].working = false;
				this.working = false;
				this.problems = true;
				this.get_core().save_and_refresh();
				this.notify(civitas.NOTIFICATION_PRODUCTION_PAUSED);
				return true;
			}
		}
		return false;
	};

	/**
	 * Demolish this building and remove it from the DOM.
	 * 
	 * @public
	 * @returns {boolean}
	 */
	this.demolish = function() {
		if (this.get_settlement().demolish(this.get_type())) {
			$('section.game .building[data-type=' + this.get_type() + ']').remove();
			this.get_core().notify(this.get_name() + ' demolished successfully!');
			return true;
		} else {
			this.get_core().error('Unable to demolish the specified building `' + this.get_name() + '`!');
			return false;
		}
	};

	/**
	 * Check if the settlement has the required materials to create this building.
	 * 
	 * @public
	 * @param {Array|String} mats
	 * @returns {Boolean}
	 */
	this.has_materials = function(mats) {
		var building = this.get_building_data();
		var res = this.get_settlement_resources();
		var mat = building.materials;
		if (typeof mats === 'object') {
			for (var i = 0; i < mats.length; i++) {
				if (mats[i] !== 'coins') {
					if (res[mats[i]] - mat[mats[i]] < 0) {
						this.get_core().log(this.get_name() + ' doesn`t have enough ' + mats[i] + '.', true);
						this.notify(civitas.NOTIFICATION_MISSING_RESOURCES);
						this.problems = true;
						return false;
					}
				}
			}
		} else {
			if (res[mats] - mat[mats] < 0) {
				this.get_core().log(this.get_name() + ' doesn`t have enough ' + mats + '.', true);
				this.notify(civitas.NOTIFICATION_MISSING_RESOURCES);
				this.problems = true;
				return false;
			}
		}
		return true;
	};

	/**
	 * Use the materials required for this building's production.
	 * 
	 * @public
	 * @param {String|Array} material
	 * @returns {civitas.objects.building}
	 */
	this.use_material = function(material) {
		var building = this.get_building_data();
		var mat = building.materials;
		if (typeof material === 'object') {
			for (var i = 0; i < material.length; i++) {
				this.get_settlement().remove_resource(material[i], mat[material[i]]);
				this.get_core().log(this.get_name() + ' used ' + mat[material[i]] + ' ' + material[i] + '.');
			}
		} else {
			this.get_settlement().remove_resource(material, mat[material]);
			this.get_core().log(this.get_name() + ' used ' + mat[material] + ' ' + material + '.');
		}
		return this;
	};

	/**
	 * Get building data from the main configuration array.
	 * 
	 * @public
	 * @returns {Object}
	 */
	this.get_building_data = function() {
		return civitas.BUILDINGS[civitas.BUILDINGS.findIndexM(this.type)];
	};

	/**
	 * Get building data.
	 * 
	 * @public
	 * @returns {Object}
	 */
	this.get_data = function() {
		return this.data;
	};

	/**
	 * Get the settlement resources object
	 * 
	 * @public
	 * @returns {Object}
	 */
	this.get_settlement_resources = function() {
		return this.get_settlement().get_resources();
	};

	/**
	 * Produce the materials.
	 * 
	 * @public
	 * @param {String|Array} material
	 * @returns {civitas.objects.building}
	 */
	this.produce_material = function(material) {
		var settlement = this.get_settlement();
		var resources = settlement.get_resources();
		var building = this.get_building_data();
		var prd = building.production;
		if (typeof material === 'object') {
			for (var i = 0; i < material.length; i++) {
				if (!this.is_producing()) {
					return this;
				}
				var amount = prd[material[i]] * this.get_level();
				if (this.get_settlement().has_storage_space_for(amount)) {
					this.get_settlement().add_to_storage(material[i], amount);
					if (typeof building.chance !== 'undefined') {
						for (var item in building.chance) {
							var rnd = Math.random();
							if (rnd < building.chance[item] * this.get_level()) {
								this.get_core().log(this.get_name() + ' procced extra ' + civitas.utils.get_resource_name(item) + '.');
								this.get_settlement().add_to_storage(item, 1);
							}
						}
					}
					this.get_core().log(this.get_name() + ' produced ' + amount + ' ' + material[i] + '.');
				}
			}
		} else {
			var amount = prd[material] * this.get_level();
			if (this.get_settlement().has_storage_space_for(amount)) {
				if (!this.is_producing()) {
					return this;
				}
				this.get_settlement().add_to_storage(material, amount);
				if (typeof building.chance !== 'undefined') {
					for (var item in building.chance) {
						var rnd = Math.random();
						if (rnd < building.chance[item]) {
							this.get_core().log(this.get_name() + ' procced extra ' + civitas.utils.get_resource_name(item) + '.');
							this.get_settlement().add_to_storage(item, 1);
						}
					}
				}
				this.get_core().log(this.get_name() + ' produced ' + amount + ' ' + material + '.');
			}
		}
		return this;
	};

	/**
	 * Process the materials and use the required ones.
	 * 
	 * @public
	 * @returns {civitas.objects.building}
	 * @param {String|Array} mats_production
	 * @param {String|Array} mats_use
	 */
	this.process_mats = function(mats_production, mats_use) {
		if (typeof mats_use !== 'undefined') {
			if (this.has_materials(mats_use)) {
				this.use_material(mats_use);
				this.produce_material(mats_production);
			}
		} else {
			this.produce_material(mats_production);
		}
		return this;
	};

	/**
	 * Raise the prestige of the settlement this building is located in.
	 * 
	 * @public
	 * @returns {Number}
	 */
	this.adjust_settlement_prestige = function() {
		var building = this.get_building_data();
		var prd = building.production;
		var amount = prd.prestige;
		this.get_settlement().raise_prestige(amount * this.get_level());
		this.get_core().log(this.get_name() + ' raised settlement prestige by ' + amount + '.');
		return this.get_settlement().get_prestige();
	};

	/**
	 * Raise the faith of the settlement this building is located in.
	 * 
	 * @public
	 * @returns {Number}
	 */
	this.adjust_settlement_faith = function() {
		var building = this.get_building_data();
		var prd = building.production;
		var amount = prd.faith;
		this.get_settlement().raise_faith(amount * this.get_level());
		this.get_core().log(this.get_name() + ' raised settlement faith by ' + amount + '.');
		return this.get_settlement().get_faith();
	};

	/**
	 * Raise the espionage of the settlement this building is located in.
	 * 
	 * @public
	 * @returns {Number}
	 */
	this.adjust_settlement_espionage = function() {
		var building = this.get_building_data();
		var prd = building.production;
		var amount = prd.espionage;
		this.get_settlement().raise_espionage(amount * this.get_level());
		this.get_core().log(this.get_name() + ' raised settlement espionage by ' + amount + '.');
		return this.get_settlement().get_espionage();
	};

	/**
	 * Raise the fame of the settlement this building is located in.
	 * 
	 * @public
	 * @returns {Number}
	 */
	this.adjust_settlement_fame = function() {
		var building = this.get_building_data();
		var prd = building.production;
		var amount = prd.fame * this.get_level();
		this.get_settlement().raise_fame(amount * this.get_level());
		this.get_core().log(this.get_name() + ' raised settlement fame by ' + amount + '.');
		return this.get_settlement().get_fame();
	};

	/**
	 * Raise the research of the settlement this building is located in by converting
	 * coins into research.
	 * 
	 * @public
	 * @returns {Object}
	 */
	this.adjust_settlement_research_for_coins = function() {
		var building = this.get_building_data();
		var mat = building.materials;
		var prd = building.production;
		if (this.get_settlement().has_coins(mat.coins)) {
			var amount = prd.research * this.get_level();
			this.get_settlement().raise_research(amount * this.get_level());
			this.get_settlement().dec_coins(mat.coins);
			this.get_core().log(this.get_name() + ' raised settlement research with ' + amount + ' at the cost of ' + mat.coins + ' coins.');
		}
		return {
			research: this.get_settlement().get_research(),
			coins: this.get_settlement().get_coins()
		};
	};

	/**
	 * Raise the fame of the settlement this building is located in by converting
	 * coins into fame.
	 * 
	 * @public
	 * @returns {Object}
	 */
	this.adjust_settlement_fame_for_coins = function() {
		var building = this.get_building_data();
		var mat = building.materials;
		var prd = building.production;
		if (this.get_settlement().has_coins(mat.coins)) {
			var amount = prd.fame * this.get_level();
			this.get_settlement().raise_fame(amount * this.get_level());
			this.get_settlement().dec_coins(mat.coins);
			this.get_core().log(this.get_name() + ' raised settlement fame with ' + amount + ' at the cost of ' + mat.coins + ' coins.');
		}
		return {
			fame: this.get_settlement().get_fame(),
			coins: this.get_settlement().get_coins()
		};
	};

	/**
	 * Calculate if the house has the required food and processes the tax.
	 * 
	 * @public
	 * @returns {civitas.objects.building}
	 */
	this.process_tax = function() {
		var _m = [];
		var building = this.get_building_data();
		var mat = building.materials;
		for (var item in mat) {
			_m.push(item);
		}
		if (_m.length > 0) {
			if (this.has_materials(_m)) {
				this.use_material(_m);
				var amount = building.tax * this.get_level();
				this.get_settlement().inc_coins(amount);
				this.get_core().log(this.get_name() + ' gave ' + amount + ' coins via tax.');
			}
		}
		return this;
	};

	/**
	 * Check if this building has the required additional buildings for production.
	 * 
	 * @public
	 * @returns {Boolean}
	 */
	this.has_requirements = function() {
		var good = true;
		var building = this.get_building_data();
		if (typeof building.requires.buildings !== 'undefined') {
			var required = building.requires.buildings;
			for (var i = 0; i < required.length; i++) {
				if (!this.get_settlement().is_building_built(required[i])) {
					good = false;
					var req = civitas.BUILDINGS[civitas.BUILDINGS.findIndexM(required[i])];
					this.get_core().log(this.get_name() + ' doesn`t have the required buildings: ' + req.name + '.', true);
					this.notify(civitas.NOTIFICATION_MISSING_RESOURCES);
					this.problems = true;
				}
			}
		}
		if (typeof building.requires.settlement_level !== 'undefined') {
			if (building.requires.settlement_level > this.get_settlement().get_level()) {
				this.get_core().log('Your settlement level is too low for ' + this.get_name() + ' to be active.', true);
				this.notify(civitas.NOTIFICATION_SETTLEMENT_LOW_LEVEL);
				good = false;
				this.problems = true;
			}
		}
		return good;
	};

	/**
	 * Internal function for further processing of the production chain.
	 * 
	 * @private
	 * @returns {civitas.objects.building}
	 */
	this._process = function() {
		var _p = [];
		var _m = [];
		var building = this.get_building_data();
		var mat = building.materials;
		for (var item in mat) {
			_m.push(item);
		}
		if (building.is_housing === true) {
			if (_m.length > 0) {
				if (this.has_materials(_m)) {
					this.use_material(_m);
					var amount = building.tax * this.get_level();
					this.get_settlement().inc_coins(amount);
					this.get_core().log(this.get_name() + ' gave ' + amount + ' coins via tax.');
				}
			}
		} else {
			if (this.is_producing()) {
				var prd = building.production;
				for (var item in prd) {
					_p.push(item);
				}
				if (this.has_requirements() === true) {
					if (_m.length > 0) {
						if (this.has_materials(_m)) {
							this.use_material(_m);
							this.produce_material(_p);
							this.problems = false;
						}
					} else {
						this.produce_material(_p);
						this.problems = false;
					}
				} else {
					this.problems = true;
				}
			} else {
				this.get_core().log(this.get_name() + ' production is stopped.');
				this.notify(civitas.NOTIFICATION_PRODUCTION_PAUSED);
				this.problems = true;
			}
		}
		return this;
	};

	/**
	 * Check if this building is the marketplace.
	 * 
	 * @public
	 * @returns {Boolean}
	 */
	this.is_marketplace = function() {
		if (this.get_type() === 'marketplace') {
			return true;
		}
		return false;
	};

	/**
	 * Main threading method for the building, this does the actual processing each turn.
	 * 
	 * @public
	 * @returns {civitas.objects.building}
	 */
	this.process = function() {
		var building = this.get_building_data();
		var res = this.get_settlement_resources();
		var prd = building.production;
		var mat = building.materials;
		if (this.has_requirements() === false) {
			return false;
		}
		switch (this.get_type()) {
			/* STORAGE */
			case 'marketplace':
				this.adjust_settlement_fame();
				break;
			case 'warehouse':
				break;
			/* MILITARY */
			case 'camp':
				break;
			case 'castle':
				this.adjust_settlement_fame_for_coins();
				this.adjust_settlement_prestige();
				break;
			/* MUNICIPAL */
			case 'embassy':
				this.adjust_settlement_fame_for_coins();
				this.adjust_settlement_espionage();
				break;
			case 'church':
				this.adjust_settlement_fame_for_coins();
				this.adjust_settlement_faith();
				break;
			case 'monastery':
				this.adjust_settlement_fame_for_coins();
				this.adjust_settlement_faith();
				break;
			case 'academy':
				this.adjust_settlement_research_for_coins();
				break;
			case 'tavern':
				this.adjust_settlement_fame_for_coins();
				break;
			/* ALL OTHER */
			default:
				this._process();
				break;
		}
		return this;
	};

	/**
	 * Get the settlement this building is located into
	 * 
	 * @public
	 * @returns {civitas.objects.settlement}
	 */
	this.get_settlement = function() {
		return this.settlement;
	};

	/**
	 * Get a pointer to the game core
	 * 
	 * @public
	 * @returns {civitas.game}
	 */
	this.get_core = function() {
		return this.get_settlement().get_core();
	};

	/**
	 * Get the name of this building
	 * 
	 * @public
	 * @returns {String}
	 */
	this.get_name = function() {
		return this.name;
	};

	/**
	 * Check whether this building has problems producing its goods.
	 * 
	 * @public
	 * @returns {Boolean}
	 */
	this.has_problems = function() {
		return this.problems;
	};

	/**
	 * Get the level of this building
	 * 
	 * @public
	 * @returns {Number}
	 */
	this.get_level = function() {
		return this.level;
	};

	/**
	 * Get the type of this building
	 * 
	 * @public
	 * @returns {String}
	 */
	this.get_type = function() {
		return this.type;
	};

	/**
	 * Return the DOM handle of this building.
	 *
	 * @public
	 * @returns {String}
	 */
	this.get_handle = function() {
		return this.handle;
	};

	/**
	 * Perform building notifications.
	 *
	 * @public
	 * @param {Number} notification_type
	 * @returns {civitas.objects.building}
	 */
	this.notify = function(notification_type) {
		var handle = $('#building-' + this.get_handle());
		switch (notification_type) {
			case civitas.NOTIFICATION_PRODUCTION_PAUSED:
				handle.empty().append('<span class="notification paused"></span>');
				break;
			case civitas.NOTIFICATION_MISSING_RESOURCES:
			default:
				handle.empty().append('<span class="notification error"></span>');
				break;
		}
		return this;
	};

	// Fire up the constructor
	return this.__init(params);
};
