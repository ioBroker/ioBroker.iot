var translate = require(__dirname + '/translate.js');

var dictionary = [
    {"en": "living room/livingroom",            "de": "Wohnzimmer", 		"ru": "зал"},
    {"en": "sleeping room/bedroom/sleepingroom","de": "Schlafzimmer", 	    "ru": "спальня"},
    {"en": "bathroom/bath", 	                "de": "Bad/Badezimmer", 	"ru": "ванная"},
    {"en": "office", 				            "de": "Arbeitszimmer", 	    "ru": "кабинет"},
    {"en": "nursery room/nurseryroom", 			"de": "Kinderzimmer", 	    "ru": "детская"},
    {"en": "guestwc", 				            "de": "Gästewc", 			"ru": "гостевой туалет"},
    {"en": "wc", 					            "de": "WC", 				"ru": "туалет"},
    {"en": "toilet", 					        "de": "Toilette", 			"ru": "туалет"},
    {"en": "floor", 				            "de": "Flur/Diele/gang", 	"ru": "коридор/прихожая"},
    {"en": "kitchen", 				            "de": "Küche/kueche", 	    "ru": "кухня"},
    {"en": "terrace", 				            "de": "Balkon/terrasse", 	"ru": "терасса/балкон"},
    {"en": "dinning room/dinningroom", 		    "de": "Esszimmer", 		    "ru": "столовая"},
    {"en": "garage", 			                "de": "Garage", 			"ru": "гараж"},
    {"en": "stairs", 				            "de": "Treppe/treppenhaus", "ru": "лестница"},
    {"en": "garden", 				            "de": "Garten", 			"ru": "сад"},
    {"en": "court", 				            "de": "Hof", 				"ru": "двор"},
    {"en": "guest room/guestroom", 	            "de": "Gästezimmer", 		"ru": "гостевая"},
    {"en": "attic", 				            "de": "Speicher", 		    "ru": "кладовка"},
    {"en": "roof", 				                "de": "Dachstuhl", 		    "ru": "крыша"},
    {"en": "terminal", 			                "de": "Anschlussraum", 	    "ru": "сени"},
    {"en": "washroom", 			                "de": "Waschraum", 		    "ru": "прачечная"},
    {"en": "heating room/heatingroom", 		    "de": "Heizungsraum/Heatingroom", "ru": "котельная"},
    {"en": "hovel", 				            "de": "Schuppen/Scheune",   "ru": "сарай"},
    {"en": "summerhouse", 			            "de": "Gartenhaus", 		"ru": "теплица"}
];

module.exports = function (lang, word) {
    return translate(dictionary, lang, word);
};