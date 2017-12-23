var translate = require(__dirname + '/translate.js');

var dictionary = [
    {"en": "living room/livingroom",            "it": "soggiorno/soggiorno",                            "de": "Wohnzimmer", 		"ru": "зал"},
    {"en": "bedroom/sleeping room/sleepingroom","it": "camera da letto/camera da letto/camera da letto","de": "Schlafzimmer", 	    "ru": "спальня"},
    {"en": "bathroom/bath", 	                "it": "Bagno/bagno",                                    "de": "Bad/Badezimmer", 	"ru": "ванная"},
    {"en": "office", 				            "it": "ufficio",                                        "de": "Arbeitszimmer", 	    "ru": "кабинет"},
    {"en": "nursery room/nurseryroom", 			"it": "stanza dei bambini/stanza dei bambini",          "de": "Kinderzimmer", 	    "ru": "детская"},
    {"en": "guestwc", 				            "it": "Guestwc",                                        "de": "Gästewc", 			"ru": "гостевой туалет"},
    {"en": "wc", 					            "it": "bagno",                                          "de": "WC", 				"ru": "туалет"},
    {"en": "toilet", 					        "it": "gabinetto",                                      "de": "Toilette", 			"ru": "туалет"},
    {"en": "floor", 				            "it": "pavimento",                                      "de": "Flur/Diele/gang", 	"ru": "коридор/прихожая"},
    {"en": "kitchen", 				            "it": "cucina",                                         "de": "Küche/kueche", 	    "ru": "кухня"},
    {"en": "terrace", 				            "it": "terrazza",                                       "de": "Balkon/terrasse", 	"ru": "терасса/балкон"},
    {"en": "dinning room/dinningroom", 		    "it": "sala da pranzo/sala da pranzo",                  "de": "Esszimmer", 		    "ru": "столовая"},
    {"en": "garage", 			                "it": "box auto",                                       "de": "Garage", 			"ru": "гараж"},
    {"en": "stairs", 				            "it": "le scale",                                       "de": "Treppe/treppenhaus", "ru": "лестница"},
    {"en": "garden", 				            "it": "giardino",                                       "de": "Garten", 			"ru": "сад"},
    {"en": "court", 				            "it": "Tribunale",                                      "de": "Hof", 				"ru": "двор"},
    {"en": "guest room/guestroom", 	            "it": "camera degli ospiti/camera",                     "de": "Gästezimmer", 		"ru": "гостевая"},
    {"en": "attic", 				            "it": "Attico",                                         "de": "Speicher", 		    "ru": "кладовка"},
    {"en": "roof", 				                "it": "tetto",                                          "de": "Dachstuhl", 		    "ru": "крыша"},
    {"en": "terminal", 			                "it": "terminale",                                      "de": "Anschlussraum", 	    "ru": "сени"},
    {"en": "washroom", 			                "it": "Toilette",                                       "de": "Waschraum", 		    "ru": "прачечная"},
    {"en": "heating room/heatingroom", 		    "it": "stanza di riscaldamento/riscaldamento",          "de": "Heizungsraum/Heatingroom", "ru": "котельная"},
    {"en": "hovel", 				            "it": "Tugurio",                                        "de": "Schuppen/Scheune",   "ru": "сарай"},
    {"en": "summerhouse", 			            "it": "casa estiva",                                    "de": "Gartenhaus", 		"ru": "теплица"}
];

module.exports = function (lang, word) {
    return translate(dictionary, lang, word);
};