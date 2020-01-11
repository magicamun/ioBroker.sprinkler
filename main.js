"use strict";

/*
 * Created with @iobroker/create-adapter v1.19.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
const h24 = 23 * 60 * 60;
const h1 = 1 * 60 * 60;
const sprinkler = 'Sprinkler';
const zimmerman = 'Zimmerman';
const average = 'average';
const tage = ['today', 'yesterday'];
const hours = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23']
const values = ['temperature', 'humidity', 'precipitation'];
const tempUnit = "°C";
const rainUnit = "mm";

function buildId() {
	var id = "";
	var dot = "";
	for (var i = 0; i < arguments.length; i++) {
		id = id + dot + arguments[i];
		dot = '.';
	}
	return id;
}

/**
 * predfitions - need to be substitutded with configured ones
 */
const stations = [
    {"id": 0, "name": "Rasen Zone 1 (Vorne)", "subscription": "fhem.0.AU_GA_Bewaesserung_Sw_01.state", "disabled": false, "parallel": false, "needs_master": 7},
    {"id": 1, "name": "Rasen Zone 2 (Mitte)", "subscription": "fhem.0.AU_GA_Bewaesserung_Sw_02.state", "disabled": false, "parallel": false, "needs_master": 7},
    {"id": 2, "name": "Rasen Zone 3 (Hinten)", "subscription": "fhem.0.AU_GA_Bewaesserung_Sw_03.state", "disabled": false, "parallel": false, "needs_master": 7},
    {"id": 3, "name": "Beet Buchs", "subscription": "fhem.0.AU_GA_Bewaesserung_Sw_04.state", "disabled": false, "parallel": false},
    {"id": 4, "name": "Terrasse", "subscription": "fhem.0.AU_GA_Bewaesserung_Sw_05.state", "disabled": false, "parallel": false},
    {"id": 5, "name": "Beet rechts", "subscription": "fhem.0.AU_GA_Bewaesserung_Sw_06.state", "disabled": false, "parallel": false},
    {"id": 6, "name": "Beet links", "subscription": "fhem.0.AU_GA_Bewaesserung_Sw_07.state", "disabled": false, "parallel": false},
    {"id": 7, "name": "Master", "subscription": "fhem.0.AU_GA_Bewaesserung_Sw_08.state", "disabled": false, "parallel": false, "master": true}
];

const programs = [
    {"id": 0, "name": "Rasen Abends", "state": 0, "stations": [
                                            { "id": 0, "duration": 45 * 60 * 60, "adjust": true},
                                            { "id": 1, "duration": 45 * 60 * 60, "adjust": true},
                                            { "id": 2, "duration": 45 * 60 * 60, "adjust": true},
                                        ], "schedule": '{astro: "sunset", shift: 90}'},
    {"id": 1, "name": "Buchs", "state": 0, "stations": [
                                            { "id": 3, "duration": 60 * 60 * 60, "adjust": true}
                                        ], "schedule": "0 10 17 * * 1,3,5"},
    {"id": 2, "name": "Terrasse", "state": 0, "stations": [
                                            { "id": 4, "duration": 30 * 60 * 60, "adjust": true}
                                        ], "schedule": "0 0 17 * * 1,2"}
];

var station_qe = {"id": - 1, "station": "", "duration": 0, "parallel": false, "subscription": "", "started": 0, "ended": 0, "needs_master": 0};
var station_waiting = [station_qe];
var station_running = [station_qe];

var program_qe = {"id": - 1, "name": "", "schedule": "", "oldstate": 0};
var program_schedule = [];
var adhoc_schedule = [];
/**
 * End of predefines
 */

// Load your modules here, e.g.:
// const fs = require("fs");


class Sprinkler extends utils.Adapter {

	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: "sprinkler",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("objectChange", this.onObjectChange.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		// Initialize your adapter here
		this.log.info("Mein Log 1");

		// tempUnit = this.getForeignObject("system.config").common.tempUnit;
		this.log.info("Mein Log 2");
				
		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:
		this.log.info("config option1: " + this.config.option1);
		this.log.info("config option2: " + this.config.option2);
		this.log.info("config Temperature-Unit: " + tempUnit);
		
		/*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		*/
		/*
		create States for Zimmerman - watering adjustment
		*/
		this.createZimmerman();

		for (var st = 0; st < stations.length; st++) {
			this.createStation(stations[st], st);
		}

		for (var p = 0; p < programs.length; p++) {
			this.createProgram(programs[p], p);
		}
		// in this template all states changes inside the adapters namespace are subscribed
		this.subscribeStates("*");

		/*
		setState examples
		you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		*/
		// the variable testVariable is set to true as command (ack=false)
		await this.setStateAsync("testVariable", true);

		// same thing, but the value is flagged "ack"
		// ack should be always set to true if the value is received from or acknowledged from the target system
		await this.setStateAsync("testVariable", { val: true, ack: true });

		// same thing, but the state is deleted after 30s (getState will return null afterwards)
		await this.setStateAsync("testVariable", { val: true, ack: true, expire: 30 });

		// examples for the checkPassword/checkGroup functions
		let result = await this.checkPasswordAsync("admin", "iobroker");
		this.log.info("check user admin pw ioboker: " + result);

		result = await this.checkGroupAsync("admin", "admin");
		this.log.info("check group user admin group admin: " + result);
	}

	/**
	 * assemble ObjectId
	 * @param {*} callback 
	 */
	buildId() {
		var id = "";
		var dot = "";
		for (var i = 0; i < arguments.length; i++) {
			id = id + dot + arguments[i];
			dot = '.';
		}
		return id;
	}
	/**
	 * Create Zimmerman States for watering adjustment
	 * @param {*} callback 
	 */
	createZimmerman() {
		this.setObjectAsync(buildId(zimmerman, "average_humidity"), {type: "state", common: {name: "rel. mittlere Luftfeuchte", type: "number", role: "state", unit: "%", read: true, write: true}, native: {},});
		this.setObjectAsync(buildId(zimmerman, "neutral_humidity"), {type: "state", common: {name: "rel. neutrale Luftfeuchte", type: "number", role: "state", unit: "%", read: true, write: true, def: 30}, native: {},});
		this.setObjectAsync(buildId(zimmerman, "average_temperature"), {type: "state", common: {name: "mittlere Temperatur", type: "number", role: "state", unit: tempUnit, read: true, write: true}, native: {},});
		this.setObjectAsync(buildId(zimmerman, "neutral_temperature"), {type: "state", common: {name: "neutrale Temperatur", type: "number", role: "state", unit: tempUnit, read: true, write: true, def: 70}, native: {},});
		this.setObjectAsync(buildId(zimmerman, "precipitation_today"), {type: "state", common: {name: "Niederschlag heute", type: "number", role: "state", unit: rainUnit, read: true, write: true,}, native: {},});
		this.setObjectAsync(buildId(zimmerman, "precipitation_yesterday"), {type: "state", common: {name: "Niederschlag gestern", type: "number", role: "state", unit: rainUnit, read: true, write: true,}, native: {},});

		this.setObjectAsync(buildId(zimmerman, "adjustment"), {type: "state", common: {name: "Anpassung Beregnungsmenge", type: "number", role: "state", unit: "%", read: true, write: true,}, native: {},});

		for (var t = 0; t <= 1; t++) {
			for (var h = 0; h <= 23; h++) {
				this.setObjectAsync(buildId(zimmerman, tage[t], values[0] + '_' + hours[h]), {type: "state", common: {name: "Temperatur ", type: "number", role: "state", unit: tempUnit, read: true, write: true,}, native: {},});
				this.setObjectAsync(buildId(zimmerman, tage[t], values[1] + '_' + hours[h]), {type: "state", common: {name: "rel. Feuchte", type: "number", role: "state", unit: tempUnit, read: true, write: true,}, native: {},});
				this.setObjectAsync(buildId(zimmerman, tage[t], values[2] + '_' + hours[h]), {type: "state", common: {name: "Niederschlag ", type: "number", role: "state", unit: tempUnit, read: true, write: true,}, native: {},});
			}
		}
	}
	/**
	 * Create Station
	 * @param {*} station 
	 * @param {*} index 
	 */
	createStation(station, index) {
		var idStation = buildId('Station', station.id.toString());

		this.setObjectAsync(buildId(idStation, 'name'), {type: "state", common: {name: "Bezeichnung Bewässerungskreis", type: "string", role: "state", read: true, write: true, def: station.name}, native: {}});
		this.setObjectAsync(buildId(idStation, 'subscription'), {type: "state", common: {name: "verknüpfter Status", type: "string", role: "state", read: true, write: true, def: station.subscription}, native: {}});
		this.setObjectAsync(buildId(idStation, 'parallel'), {type: "state", common: {name: "Parallel", type: "bool", role: "state", read: true, write: true, def: station.parallel}, native: {}});
		this.setObjectAsync(buildId(idStation, 'disabled'), {type: "state", common: {name: "Disabled", type: "bool", role: "state", read: true, write: true, def: station.disabled}, native: {}});
		this.setObjectAsync(buildId(idStation, 'activate'), {type: "state", common: {name: "Aktivieren für n Sekunden", type: "bool", role: "state", read: true, write: true}, native: {}});
		this.setObjectAsync(buildId(idStation, 'state'), {type: "state", common: {name: "Aktiv", type: "number", role: "state", states: "0:not running; 1:waiting; 2:running; 3:stopping", read: true, write: true}, native: {}});
		this.setObjectAsync(buildId(idStation, 'started'), {type: "state", common: {name: "letzter Start", type: "number", role: "state", read: true, write: true}, native: {}});
		this.setObjectAsync(buildId(idStation, 'ended'), {type: "state", common: {name: "letztes Ende", type: "number", role: "state", read: true, write: true}, native: {}});
		this.setObjectAsync(buildId(idStation, 'master'), {type: "state", common: {name: "Masterstation?", type: "bool", role: "state", read: true, write: true, def: station.master}, native: {}});
		this.setObjectAsync(buildId(idStation, 'needs_master'), {type: "state", common: {name: "benötigt Master", type: "number", role: "state", read: true, write: true, def: station.needs_master}, native: {}});
	}

	/**
	 * create Program
	 * @param {*} program 
	 * @param {*} pi 
	 */
	createProgram(program, pi) {
		var idProgram = buildId('Program', pi.toString()); 
		var result;

		this.setObjectAsync(buildId(idProgram, 'name'), {type: "state", common: {name: "Programmname", type: "string", role: "state", read: true, write: true, def: program.name}, native: {}});
		this.setObjectAsync(buildId(idProgram, 'state'), {type: "state", common: {name: "Status", type: "number", role: "state", states: "0:unscheduled; 1:scheduled; 2:inactive; 3:adHoc", read: true, write: true, def: program.state}, native: {}});
		this.setObjectAsync(buildId(idProgram, 'schedule'), {type: "state", common: {name: "Zeitplan", type: "string", role: "state", read: true, write: true, def: program.state}, native: {}});
		
		for (var ps = 0; ps < program.stations.length; ps++) {
			this.setObjectAsync(buildId(idProgram, 'nr', ps.toString(), 'station'), {type: "state", common: {name: "Bewässerungskreis", type: "string", role: "state", read: true, write: true, def: parseInt(program.stations[ps].id)}, native: {}});
			this.setObjectAsync(buildId(idProgram, 'nr', ps.toString(), 'duration'), {type: "state", common: {name: "Dauer", type: "number", role: "state", read: true, write: true, def: parseInt(program.stations[ps].duration)}, native: {}});
			this.setObjectAsync(buildId(idProgram, 'nr', ps.toString(), 'adjust'), {type: "state", common: {name: "Zimmerman-Anpassung", type: "bool", role: "state", read: true, write: true, def: program.stations[ps].adjust}, native: {}});
		};
	
		if (program.state == 0) { // Unscheduled
			this.log.info('Schedule.1: ' + program.schedule);
			/*
			var result = this.schedule(program.schedule, function() {
				SprinklerRunProgram(pi);
			});
			*/
			this.log.info('Schedule.2: ' + result);
			// setState(SprinklerBuildId(idProgram, 'state'), 1);
		}
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			this.log.info("cleaned everything up...");
			callback();
		} catch (e) {
			callback();
		}
	}

	/**
	 * Is called if a subscribed object changes
	 * @param {string} id
	 * @param {ioBroker.Object | null | undefined} obj
	 */
	onObjectChange(id, obj) {
		if (obj) {
			// The object was changed
			this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
		} else {
			// The object was deleted
			this.log.info(`object ${id} deleted`);
		}
	}

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	onStateChange(id, state) {
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.message" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === "object" && obj.message) {
	// 		if (obj.command === "send") {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info("send command");

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
	// 		}
	// 	}
	// }

}

// @ts-ignore parent is a valid property on module
if (module.parent) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Sprinkler(options);
} else {
	// otherwise start the instance directly
	new Sprinkler();
}