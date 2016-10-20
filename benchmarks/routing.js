const Benchmark = require("benchmark");
const kv = require("../");

const suite = new Benchmark.Suite();

const dataDir = __dirname + "/data/";

let basicCorpus = require(dataDir + "corpus-basic");
let pathologicalCorpus = require(dataDir + "corpus-pathological");
let realisticCorpus = require(dataDir + "corpus-realistic");

let noRouting = new kv.logger("perf", kv.logger.LEVELS.Debug, (noop) => "", (noop) => "");
let basicRouting = new kv.logger("perf", kv.logger.LEVELS.Debug, (noop) => "", (noop) => "");
let pathoRouting = new kv.logger("perf", kv.logger.LEVELS.Debug, (noop) => "", (noop) => "");
let realRouting = new kv.logger("perf", kv.logger.LEVELS.Debug, (noop) => "", (noop) => "");

basicRouting.setRoutingConfig(dataDir + "kvconfig-basic.yml");
pathoRouting.setRoutingConfig(dataDir + "kvconfig-pathological.yml");
realRouting.setRoutingConfig(dataDir + "kvconfig-realistic.yml");

suite
	// No routing
	.add("no routing with basic corpus", () => {
		for(let i = 0; i < basicCorpus.length; i++) {
			noRouting.info(basicCorpus[i].title);
		}
	})
	.add("no routing with pathological corpus", () => {
		for(let i = 0; i < pathologicalCorpus.length; i++) {
			const log = pathologicalCorpus[i];
			noRouting.infoD(log.title, log.data);
		}
	})
	.add("no routing with realistic corpus", () => {
		for(let i = 0; i < realisticCorpus.length; i++) {
			const log = realisticCorpus[i];
			noRouting.infoD(log.title, log.data);
		}
	})

	// Basic routing
	.add("basic routing with basic corpus", () => {
		for(let i = 0; i < basicCorpus.length; i++) {
			basicRouting.info(basicCorpus[i].title);
		}
	})
	.add("basic routing with pathological corpus", () => {
		for(let i = 0; i < pathologicalCorpus.length; i++) {
			const log = pathologicalCorpus[i];
			basicRouting.infoD(log.title, log.data);
		}
	})
	.add("basic routing with realistic corpus", () => {
		for(let i = 0; i < realisticCorpus.length; i++) {
			const log = realisticCorpus[i];
			basicRouting.infoD(log.title, log.data);
		}
	})

	// Pathological routing
	.add("pathological routing with basic corpus", () => {
		for(let i = 0; i < basicCorpus.length; i++) {
			pathoRouting.info(basicCorpus[i].title);
		}
	})
	.add("pathological routing with pathological corpus", () => {
		for(let i = 0; i < pathologicalCorpus.length; i++) {
			const log = pathologicalCorpus[i];
			pathoRouting.infoD(log.title, log.data);
		}
	})
	.add("pathological routing with realistic corpus", () => {
		for(let i = 0; i < realisticCorpus.length; i++) {
			const log = realisticCorpus[i];
			pathoRouting.infoD(log.title, log.data);
		}
	})

	// Realistic routing
	.add("realistic routing with basic corpus", () => {
		for(let i = 0; i < basicCorpus.length; i++) {
			realRouting.info(basicCorpus[i].title);
		}
	})
	.add("realistic routing with pathological corpus", () => {
		for(let i = 0; i < pathologicalCorpus.length; i++) {
			const log = pathologicalCorpus[i];
			realRouting.infoD(log.title, log.data);
		}
	})
	.add("realistic routing with realistic corpus", () => {
		for(let i = 0; i < realisticCorpus.length; i++) {
			const log = realisticCorpus[i];
			realRouting.infoD(log.title, log.data);
		}
	})

	.on("cycle", (event) => {
		console.log(String(event.target));
	})
	.on("complete", () => {
		console.log("Done!");
	})
	.run()
;
