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
		await this.setObjectAsync(this.buildId(zimmerman, "average_humidity"), {type: "state", common: {name: "rel. mittlere Luftfeuchte", type: "number", role: "state", unit: "%", read: true, write: true}, native: {},});
		await this.setObjectAsync(this.buildId(zimmerman, "neutral_humidity"), {type: "state", common: {name: "rel. neutrale Luftfeuchte", type: "number", role: "state", unit: "%", read: true, write: true, def: 30}, native: {},});
		await this.setObjectAsync(this.buildId(zimmerman, "average_temperature"), {type: "state", common: {name: "mittlere Temperatur", type: "number", role: "state", unit: tempUnit, read: true, write: true}, native: {},});
		await this.setObjectAsync(this.buildId(zimmerman, "neutral_temperature"), {type: "state", common: {name: "neutrale Temperatur", type: "number", role: "state", unit: tempUnit, read: true, write: true, def: 70}, native: {},});
		await this.setObjectAsync(this.buildId(zimmerman, "precipitation_today"), {type: "state", common: {name: "Niederschlag heute", type: "number", role: "state", unit: rainUnit, read: true, write: true,}, native: {},});
		await this.setObjectAsync(this.buildId(zimmerman, "precipitation_yesterday"), {type: "state", common: {name: "Niederschlag gestern", type: "number", role: "state", unit: rainUnit, read: true, write: true,}, native: {},});

		await this.setObjectAsync(this.buildId(zimmerman, "adjustment"), {type: "state", common: {name: "Anpassung Beregnungsmenge", type: "number", role: "state", unit: "%", read: true, write: true,}, native: {},});

		for (var t = 0; t <= 1; t++) {
			for (var h = 0; h <= 23; h++) {
				await this.setObjectAsync(this.buildId(zimmerman, tage[t], values[0] + '_' + hours[h]), {type: "state", common: {name: "Temperatur ", type: "number", role: "state", unit: tempUnit, read: true, write: true,}, native: {},});
				await this.setObjectAsync(this.buildId(zimmerman, tage[t], values[1] + '_' + hours[h]), {type: "state", common: {name: "rel. Feuchte", type: "number", role: "state", unit: tempUnit, read: true, write: true,}, native: {},});
				await this.setObjectAsync(this.buildId(zimmerman, tage[t], values[2] + '_' + hours[h]), {type: "state", common: {name: "Niederschlag ", type: "number", role: "state", unit: tempUnit, read: true, write: true,}, native: {},});
			}
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