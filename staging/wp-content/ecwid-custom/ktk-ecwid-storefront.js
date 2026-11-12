(function() {
	"use strict";

	var TARGET_SLUG = "/store/Bubble-Football-p637225330".toLowerCase();
	var TARGET_TOKEN = "bubble-football-p637225330";
	var TARGET_CLASS = "ktk-bubble-football-product";
	var CONTAINER_ID = "ktk-bf-canvas";
	var OPTIONS_MOUNT_ID = "ktk-bf-options-live";
	var NEXT_BUTTON_ID = "ktk-bf-next";
	var PREV_BUTTON_ID = "ktk-bf-prev";
	var BALANCE_ID = "ktk-bf-balance";
	var retryTimer = null;
	var scheduled = false;
	var lastRenderSignature = "";
	var gestureBound = false;
	var stageDelegateBound = false;
	var currentStage = 0;
	var touchStartY = null;
	var wheelLock = false;
	var gestureCleanup = [];
	var optionsObserver = null;
	var optionsObserverRoot = null;

	var FALLBACK_IMAGE = "https://d2j6dbq0eux0bg.cloudfront.net/images/100323031/4185643684.jpg";
	var FALLBACK_DESCRIPTION = [
		"Add a crazy twist to the worlds most popular game with bubble football!",
		"Immersed in a giant inflatable bubble you can run, bounce and roll your way around the pitch.",
		"This activity is hilarious and can be played indoors or outdoors depending on weather."
	].join(" ");

	function isTargetPage() {
		var path = (window.location && window.location.pathname ? window.location.pathname : "").toLowerCase();
		return path.indexOf(TARGET_SLUG) !== -1 || path.indexOf(TARGET_TOKEN) !== -1;
	}

	function setTargetClass(enabled) {
		if (document.documentElement) document.documentElement.classList.toggle(TARGET_CLASS, enabled);
		if (document.body) document.body.classList.toggle(TARGET_CLASS, enabled);
	}

	function getMountRoot() {
		return document.querySelector("#main-content") || document.querySelector("#et-main-area") || document.body;
	}

	function getOrCreateCanvas() {
		var existing = document.getElementById(CONTAINER_ID);
		if (existing) return existing;
		var root = getMountRoot();
		if (!root) return null;
		var el = document.createElement("section");
		el.id = CONTAINER_ID;
		el.className = "ktk-bf-custom-layout";
		if (root.firstElementChild) {
			root.insertBefore(el, root.firstElementChild);
		} else {
			root.appendChild(el);
		}
		return el;
	}

	function removeCanvas() {
		var existing = document.getElementById(CONTAINER_ID);
		if (existing) existing.remove();
		setTargetClass(false);
		if (optionsObserver) {
			optionsObserver.disconnect();
			optionsObserver = null;
			optionsObserverRoot = null;
		}
		if (gestureBound) {
			for (var i = 0; i < gestureCleanup.length; i += 1) {
				gestureCleanup[i]();
			}
			gestureCleanup = [];
			gestureBound = false;
		}
	}

	function queryFirst(selectors) {
		for (var i = 0; i < selectors.length; i += 1) {
			var el = document.querySelector(selectors[i]);
			if (el) return el;
		}
		return null;
	}

	function escapeRegExp(value) {
		return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}

	function safeParseJson(text) {
		try {
			return JSON.parse(text);
		} catch (e) {
			return null;
		}
	}

	function toAbsoluteUrl(raw) {
		if (!raw) return "";
		if (typeof raw !== "string") return "";
		try {
			return new URL(raw, window.location.origin).toString();
		} catch (e) {
			return raw;
		}
	}

	function firstSrcsetUrl(srcset) {
		if (!srcset || typeof srcset !== "string") return "";
		var first = srcset.split(",")[0];
		if (!first) return "";
		return first.trim().split(/\s+/)[0] || "";
	}

	function extractImageFromUnknown(value) {
		if (!value) return "";
		if (typeof value === "string") return toAbsoluteUrl(value);
		if (Array.isArray(value)) {
			for (var i = 0; i < value.length; i += 1) {
				var nested = extractImageFromUnknown(value[i]);
				if (nested) return nested;
			}
			return "";
		}
		if (typeof value === "object") {
			return (
				extractImageFromUnknown(value.contentUrl) ||
				extractImageFromUnknown(value.thumbnailUrl) ||
				extractImageFromUnknown(value.url) ||
				extractImageFromUnknown(value.image)
			);
		}
		return "";
	}

	function extractTitle() {
		var el = queryFirst([".ec-page-title", "[class*='product-title']", "h1"]);
		return el && el.textContent ? el.textContent.trim() : "Bubble Football";
	}

	function extractImage() {
		var img = queryFirst([
			".details-gallery__picture",
			".details-product-gallery img",
			".product-details__gallery img",
			"[class*='gallery'] img",
			".ec-store img",
			"img[src*='bubble']"
		]);

		if (img) {
			var direct =
				img.currentSrc ||
				img.src ||
				img.getAttribute("src") ||
				img.getAttribute("data-src") ||
				firstSrcsetUrl(img.srcset || img.getAttribute("srcset"));
			if (direct) return toAbsoluteUrl(direct);
		}

		var ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
		for (var i = 0; i < ldScripts.length; i += 1) {
			var parsed = safeParseJson(ldScripts[i].textContent || "");
			if (!parsed || typeof parsed !== "object") continue;

			var candidates = Array.isArray(parsed) ? parsed : [parsed];
			for (var j = 0; j < candidates.length; j += 1) {
				var url = extractImageFromUnknown(candidates[j]);
				if (url) return url;
			}
		}

		return FALLBACK_IMAGE;
	}

	function extractDescriptionHtml(title) {
		var el = queryFirst([
			".ec-store .details-product-description__content",
			".ec-store .details-product-description",
			".details-product-description__content",
			".details-product-description",
			".product-details__description"
		]);

		if (!el) return "<p>" + FALLBACK_DESCRIPTION + "</p>";

		var clone = el.cloneNode(true);

		var junk = clone.querySelectorAll(
			"script,style,noscript,iframe,object,embed,button,[class*='show-more'],[class*='read-more'],[data-read-more]"
		);
		for (var i = 0; i < junk.length; i += 1) junk[i].remove();

		var html = (clone.innerHTML || "").trim();
		if (!html) {
			var txt = (clone.textContent || "").replace(/\s+/g, " ").trim();
			return txt ? "<p>" + txt + "</p>" : "<p>" + FALLBACK_DESCRIPTION + "</p>";
		}

		html = html.replace(/\bProduct Details\b/gi, "");
		html = html.replace(/\bShow More\b/gi, "");
		if (title) {
			var titleLead = new RegExp("^\\s*" + escapeRegExp(title) + "\\s*", "i");
			html = html.replace(titleLead, "");
		}

		var probe = document.createElement("div");
		probe.innerHTML = html;
		var text = (probe.textContent || "").replace(/\s+/g, " ").trim();
		if (!text) return "<p>" + FALLBACK_DESCRIPTION + "</p>";

		return html;
	}

	function parseMoneyAmount(value) {
		if (value === null || value === undefined) return 0;
		var text = String(value).replace(/\u00A0/g, " ").replace(/,/g, ".");
		var cleaned = text.replace(/[^0-9.+-]/g, "");
		if (!cleaned || cleaned === "+" || cleaned === "-") return 0;
		var num = parseFloat(cleaned);
		return Number.isFinite(num) ? num : 0;
	}

	function extractPriceFromUnknown(value) {
		if (!value) return 0;
		if (Array.isArray(value)) {
			for (var i = 0; i < value.length; i += 1) {
				var fromArr = extractPriceFromUnknown(value[i]);
				if (fromArr > 0) return fromArr;
			}
			return 0;
		}
		if (typeof value === "object") {
			if (value.price !== undefined && value.price !== null) {
				var direct = parseMoneyAmount(value.price);
				if (direct > 0) return direct;
			}
			if (value.offers) {
				var fromOffers = extractPriceFromUnknown(value.offers);
				if (fromOffers > 0) return fromOffers;
			}
			if (value["@graph"]) {
				var fromGraph = extractPriceFromUnknown(value["@graph"]);
				if (fromGraph > 0) return fromGraph;
			}
			for (var key in value) {
				if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
				if (key === "price" || key === "offers" || key === "@graph") continue;
				var nested = extractPriceFromUnknown(value[key]);
				if (nested > 0) return nested;
			}
			return 0;
		}
		return 0;
	}

	function extractBasePriceAmount() {
		var priceEl = queryFirst([
			".details-product-purchase__price",
			".product-details__product-price",
			".details-product-price",
			"[class*='product-price']",
			"[class*='ProductPrice']"
		]);
		if (priceEl) {
			var fromDom = parseMoneyAmount(priceEl.textContent || "");
			if (fromDom > 0) return fromDom;
		}

		var ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
		for (var i = 0; i < ldScripts.length; i += 1) {
			var parsed = safeParseJson(ldScripts[i].textContent || "");
			if (!parsed) continue;
			var fromLd = extractPriceFromUnknown(parsed);
			if (fromLd > 0) return fromLd;
		}

		return 0;
	}

	function parseOptionDelta(optionText) {
		var text = String(optionText || "");
		var match = text.match(/\(([+-]?\s*\d+(?:[.,]\d{1,2})?)\)/);
		if (!match) return 0;
		return parseMoneyAmount(match[1]);
	}

	function computeOptionDeltaTotal() {
		var root = document.getElementById(OPTIONS_MOUNT_ID);
		if (!root) return 0;
		var selects = root.querySelectorAll("select");
		var total = 0;
		for (var i = 0; i < selects.length; i += 1) {
			var select = selects[i];
			if (!select || select.classList.contains("ktk-phone-code")) continue;
			var idx = select.selectedIndex;
			if (idx < 0 || !select.options || !select.options[idx]) continue;
			var txt = (select.options[idx].textContent || "").trim();
			total += parseOptionDelta(txt);
		}
		return total;
	}

	function updateBalanceDisplay() {
		var balanceEl = document.getElementById(BALANCE_ID);
		if (!balanceEl) return;
		var base = extractBasePriceAmount();
		var extra = computeOptionDeltaTotal();
		var total = base + extra;
		if (!Number.isFinite(total)) total = 0;
		balanceEl.textContent = total.toFixed(2) + " zł";
	}

	function bindBalanceUpdater() {
		var root = document.getElementById(OPTIONS_MOUNT_ID);
		if (!root) return;
		if (!root.dataset.ktkBalanceBound) {
			var onChange = function() {
				setTimeout(updateBalanceDisplay, 0);
			};
			root.addEventListener("change", onChange);
			root.addEventListener("input", onChange);
			root.dataset.ktkBalanceBound = "1";
		}
		updateBalanceDisplay();
	}

	function moveRealEcwidOptions() {
		var mount = document.getElementById(OPTIONS_MOUNT_ID);
		if (!mount) return false;

		var source = queryFirst([
			".ec-store .product-details__product-options"
		]);
		if (!source) {
			var options = document.querySelectorAll(".ec-store .details-product-option");
			if (!options || !options.length) return false;

			mount.innerHTML = "";
			var tempWrap = document.createElement("div");
			tempWrap.className = "ktk-bf-live-options-wrap";
			for (var i = 0; i < options.length; i += 1) {
				tempWrap.appendChild(options[i]);
			}
			mount.appendChild(tempWrap);
			return true;
		}

		if (source.parentElement !== mount) {
			mount.innerHTML = "";
			mount.appendChild(source);
		}
		return true;
	}

	function personalizeOptions() {
		var root = document.getElementById(OPTIONS_MOUNT_ID);
		if (!root) return;
		var phoneCountryOptions = [
			{ iso: "AF", name: "Afghanistan", code: "+93", label: "Afghanistan (+93)", short: "AF (+93)" },
			{ iso: "AX", name: "Aland", code: "+358", label: "Aland (+358)", short: "AX (+358)" },
			{ iso: "AL", name: "Albania", code: "+355", label: "Albania (+355)", short: "AL (+355)" },
			{ iso: "DZ", name: "Algeria", code: "+213", label: "Algeria (+213)", short: "DZ (+213)" },
			{ iso: "AS", name: "American Samoa", code: "+1684", label: "American Samoa (+1684)", short: "AS (+1684)" },
			{ iso: "AD", name: "Andorra", code: "+376", label: "Andorra (+376)", short: "AD (+376)" },
			{ iso: "AO", name: "Angola", code: "+244", label: "Angola (+244)", short: "AO (+244)" },
			{ iso: "AI", name: "Anguilla", code: "+1264", label: "Anguilla (+1264)", short: "AI (+1264)" },
			{ iso: "AQ", name: "Antarctica", code: "+672", label: "Antarctica (+672)", short: "AQ (+672)" },
			{ iso: "AG", name: "Antigua and Barbuda", code: "+1268", label: "Antigua and Barbuda (+1268)", short: "AG (+1268)" },
			{ iso: "AR", name: "Argentina", code: "+54", label: "Argentina (+54)", short: "AR (+54)" },
			{ iso: "AM", name: "Armenia", code: "+374", label: "Armenia (+374)", short: "AM (+374)" },
			{ iso: "AW", name: "Aruba", code: "+297", label: "Aruba (+297)", short: "AW (+297)" },
			{ iso: "AC", name: "Ascension Island", code: "+247", label: "Ascension Island (+247)", short: "AC (+247)" },
			{ iso: "AU", name: "Australia", code: "+61", label: "Australia (+61)", short: "AU (+61)" },
			{ iso: "AT", name: "Austria", code: "+43", label: "Austria (+43)", short: "AT (+43)" },
			{ iso: "AZ", name: "Azerbaijan", code: "+994", label: "Azerbaijan (+994)", short: "AZ (+994)" },
			{ iso: "BS", name: "Bahamas", code: "+1242", label: "Bahamas (+1242)", short: "BS (+1242)" },
			{ iso: "BH", name: "Bahrain", code: "+973", label: "Bahrain (+973)", short: "BH (+973)" },
			{ iso: "BD", name: "Bangladesh", code: "+880", label: "Bangladesh (+880)", short: "BD (+880)" },
			{ iso: "BB", name: "Barbados", code: "+1246", label: "Barbados (+1246)", short: "BB (+1246)" },
			{ iso: "BY", name: "Belarus", code: "+375", label: "Belarus (+375)", short: "BY (+375)" },
			{ iso: "BE", name: "Belgium", code: "+32", label: "Belgium (+32)", short: "BE (+32)" },
			{ iso: "BZ", name: "Belize", code: "+501", label: "Belize (+501)", short: "BZ (+501)" },
			{ iso: "BJ", name: "Benin", code: "+229", label: "Benin (+229)", short: "BJ (+229)" },
			{ iso: "BM", name: "Bermuda", code: "+1441", label: "Bermuda (+1441)", short: "BM (+1441)" },
			{ iso: "BT", name: "Bhutan", code: "+975", label: "Bhutan (+975)", short: "BT (+975)" },
			{ iso: "BO", name: "Bolivia", code: "+591", label: "Bolivia (+591)", short: "BO (+591)" },
			{ iso: "BQ", name: "Bonaire", code: "+5997", label: "Bonaire (+5997)", short: "BQ (+5997)" },
			{ iso: "BA", name: "Bosnia and Herzegovina", code: "+387", label: "Bosnia and Herzegovina (+387)", short: "BA (+387)" },
			{ iso: "BW", name: "Botswana", code: "+267", label: "Botswana (+267)", short: "BW (+267)" },
			{ iso: "BV", name: "Bouvet Island", code: "+47", label: "Bouvet Island (+47)", short: "BV (+47)" },
			{ iso: "BR", name: "Brazil", code: "+55", label: "Brazil (+55)", short: "BR (+55)" },
			{ iso: "IO", name: "British Indian Ocean Territory", code: "+246", label: "British Indian Ocean Territory (+246)", short: "IO (+246)" },
			{ iso: "VG", name: "British Virgin Islands", code: "+1284", label: "British Virgin Islands (+1284)", short: "VG (+1284)" },
			{ iso: "BN", name: "Brunei", code: "+673", label: "Brunei (+673)", short: "BN (+673)" },
			{ iso: "BG", name: "Bulgaria", code: "+359", label: "Bulgaria (+359)", short: "BG (+359)" },
			{ iso: "BF", name: "Burkina Faso", code: "+226", label: "Burkina Faso (+226)", short: "BF (+226)" },
			{ iso: "BI", name: "Burundi", code: "+257", label: "Burundi (+257)", short: "BI (+257)" },
			{ iso: "KH", name: "Cambodia", code: "+855", label: "Cambodia (+855)", short: "KH (+855)" },
			{ iso: "CM", name: "Cameroon", code: "+237", label: "Cameroon (+237)", short: "CM (+237)" },
			{ iso: "CA", name: "Canada", code: "+1", label: "Canada (+1)", short: "CA (+1)" },
			{ iso: "CV", name: "Cape Verde", code: "+238", label: "Cape Verde (+238)", short: "CV (+238)" },
			{ iso: "KY", name: "Cayman Islands", code: "+1345", label: "Cayman Islands (+1345)", short: "KY (+1345)" },
			{ iso: "CF", name: "Central African Republic", code: "+236", label: "Central African Republic (+236)", short: "CF (+236)" },
			{ iso: "TD", name: "Chad", code: "+235", label: "Chad (+235)", short: "TD (+235)" },
			{ iso: "CL", name: "Chile", code: "+56", label: "Chile (+56)", short: "CL (+56)" },
			{ iso: "CN", name: "China", code: "+86", label: "China (+86)", short: "CN (+86)" },
			{ iso: "CX", name: "Christmas Island", code: "+61", label: "Christmas Island (+61)", short: "CX (+61)" },
			{ iso: "CC", name: "Cocos (Keeling) Islands", code: "+61", label: "Cocos (Keeling) Islands (+61)", short: "CC (+61)" },
			{ iso: "CO", name: "Colombia", code: "+57", label: "Colombia (+57)", short: "CO (+57)" },
			{ iso: "KM", name: "Comoros", code: "+269", label: "Comoros (+269)", short: "KM (+269)" },
			{ iso: "CK", name: "Cook Islands", code: "+682", label: "Cook Islands (+682)", short: "CK (+682)" },
			{ iso: "CR", name: "Costa Rica", code: "+506", label: "Costa Rica (+506)", short: "CR (+506)" },
			{ iso: "HR", name: "Croatia", code: "+385", label: "Croatia (+385)", short: "HR (+385)" },
			{ iso: "CU", name: "Cuba", code: "+53", label: "Cuba (+53)", short: "CU (+53)" },
			{ iso: "CW", name: "Curacao", code: "+5999", label: "Curacao (+5999)", short: "CW (+5999)" },
			{ iso: "CY", name: "Cyprus", code: "+357", label: "Cyprus (+357)", short: "CY (+357)" },
			{ iso: "CZ", name: "Czech Republic", code: "+420", label: "Czech Republic (+420)", short: "CZ (+420)" },
			{ iso: "CD", name: "Democratic Republic of the Congo", code: "+243", label: "Democratic Republic of the Congo (+243)", short: "CD (+243)" },
			{ iso: "DK", name: "Denmark", code: "+45", label: "Denmark (+45)", short: "DK (+45)" },
			{ iso: "DJ", name: "Djibouti", code: "+253", label: "Djibouti (+253)", short: "DJ (+253)" },
			{ iso: "DM", name: "Dominica", code: "+1767", label: "Dominica (+1767)", short: "DM (+1767)" },
			{ iso: "DO", name: "Dominican Republic", code: "+1809", label: "Dominican Republic (+1809)", short: "DO (+1809)" },
			{ iso: "TL", name: "East Timor", code: "+670", label: "East Timor (+670)", short: "TL (+670)" },
			{ iso: "EC", name: "Ecuador", code: "+593", label: "Ecuador (+593)", short: "EC (+593)" },
			{ iso: "EG", name: "Egypt", code: "+20", label: "Egypt (+20)", short: "EG (+20)" },
			{ iso: "SV", name: "El Salvador", code: "+503", label: "El Salvador (+503)", short: "SV (+503)" },
			{ iso: "GQ", name: "Equatorial Guinea", code: "+240", label: "Equatorial Guinea (+240)", short: "GQ (+240)" },
			{ iso: "ER", name: "Eritrea", code: "+291", label: "Eritrea (+291)", short: "ER (+291)" },
			{ iso: "EE", name: "Estonia", code: "+372", label: "Estonia (+372)", short: "EE (+372)" },
			{ iso: "SZ", name: "Eswatini", code: "+268", label: "Eswatini (+268)", short: "SZ (+268)" },
			{ iso: "ET", name: "Ethiopia", code: "+251", label: "Ethiopia (+251)", short: "ET (+251)" },
			{ iso: "FK", name: "Falkland Islands", code: "+500", label: "Falkland Islands (+500)", short: "FK (+500)" },
			{ iso: "FO", name: "Faroe Islands", code: "+298", label: "Faroe Islands (+298)", short: "FO (+298)" },
			{ iso: "FJ", name: "Fiji", code: "+679", label: "Fiji (+679)", short: "FJ (+679)" },
			{ iso: "FI", name: "Finland", code: "+358", label: "Finland (+358)", short: "FI (+358)" },
			{ iso: "FR", name: "France", code: "+33", label: "France (+33)", short: "FR (+33)" },
			{ iso: "GF", name: "French Guiana", code: "+594", label: "French Guiana (+594)", short: "GF (+594)" },
			{ iso: "PF", name: "French Polynesia", code: "+689", label: "French Polynesia (+689)", short: "PF (+689)" },
			{ iso: "TF", name: "French Southern Territories", code: "+262", label: "French Southern Territories (+262)", short: "TF (+262)" },
			{ iso: "GA", name: "Gabon", code: "+241", label: "Gabon (+241)", short: "GA (+241)" },
			{ iso: "GM", name: "Gambia", code: "+220", label: "Gambia (+220)", short: "GM (+220)" },
			{ iso: "GE", name: "Georgia", code: "+995", label: "Georgia (+995)", short: "GE (+995)" },
			{ iso: "DE", name: "Germany", code: "+49", label: "Germany (+49)", short: "DE (+49)" },
			{ iso: "GH", name: "Ghana", code: "+233", label: "Ghana (+233)", short: "GH (+233)" },
			{ iso: "GI", name: "Gibraltar", code: "+350", label: "Gibraltar (+350)", short: "GI (+350)" },
			{ iso: "GR", name: "Greece", code: "+30", label: "Greece (+30)", short: "GR (+30)" },
			{ iso: "GL", name: "Greenland", code: "+299", label: "Greenland (+299)", short: "GL (+299)" },
			{ iso: "GD", name: "Grenada", code: "+1473", label: "Grenada (+1473)", short: "GD (+1473)" },
			{ iso: "GP", name: "Guadeloupe", code: "+590", label: "Guadeloupe (+590)", short: "GP (+590)" },
			{ iso: "GU", name: "Guam", code: "+1671", label: "Guam (+1671)", short: "GU (+1671)" },
			{ iso: "GT", name: "Guatemala", code: "+502", label: "Guatemala (+502)", short: "GT (+502)" },
			{ iso: "GG", name: "Guernsey", code: "+44", label: "Guernsey (+44)", short: "GG (+44)" },
			{ iso: "GN", name: "Guinea", code: "+224", label: "Guinea (+224)", short: "GN (+224)" },
			{ iso: "GW", name: "Guinea-Bissau", code: "+245", label: "Guinea-Bissau (+245)", short: "GW (+245)" },
			{ iso: "GY", name: "Guyana", code: "+592", label: "Guyana (+592)", short: "GY (+592)" },
			{ iso: "HT", name: "Haiti", code: "+509", label: "Haiti (+509)", short: "HT (+509)" },
			{ iso: "HM", name: "Heard Island and McDonald Islands", code: "+61", label: "Heard Island and McDonald Islands (+61)", short: "HM (+61)" },
			{ iso: "HN", name: "Honduras", code: "+504", label: "Honduras (+504)", short: "HN (+504)" },
			{ iso: "HK", name: "Hong Kong", code: "+852", label: "Hong Kong (+852)", short: "HK (+852)" },
			{ iso: "HU", name: "Hungary", code: "+36", label: "Hungary (+36)", short: "HU (+36)" },
			{ iso: "IS", name: "Iceland", code: "+354", label: "Iceland (+354)", short: "IS (+354)" },
			{ iso: "IN", name: "India", code: "+91", label: "India (+91)", short: "IN (+91)" },
			{ iso: "ID", name: "Indonesia", code: "+62", label: "Indonesia (+62)", short: "ID (+62)" },
			{ iso: "IR", name: "Iran", code: "+98", label: "Iran (+98)", short: "IR (+98)" },
			{ iso: "IQ", name: "Iraq", code: "+964", label: "Iraq (+964)", short: "IQ (+964)" },
			{ iso: "IE", name: "Ireland", code: "+353", label: "Ireland (+353)", short: "IE (+353)" },
			{ iso: "IM", name: "Isle of Man", code: "+44", label: "Isle of Man (+44)", short: "IM (+44)" },
			{ iso: "IL", name: "Israel", code: "+972", label: "Israel (+972)", short: "IL (+972)" },
			{ iso: "IT", name: "Italy", code: "+39", label: "Italy (+39)", short: "IT (+39)" },
			{ iso: "CI", name: "Ivory Coast", code: "+225", label: "Ivory Coast (+225)", short: "CI (+225)" },
			{ iso: "JM", name: "Jamaica", code: "+1876", label: "Jamaica (+1876)", short: "JM (+1876)" },
			{ iso: "JP", name: "Japan", code: "+81", label: "Japan (+81)", short: "JP (+81)" },
			{ iso: "JE", name: "Jersey", code: "+44", label: "Jersey (+44)", short: "JE (+44)" },
			{ iso: "JO", name: "Jordan", code: "+962", label: "Jordan (+962)", short: "JO (+962)" },
			{ iso: "KZ", name: "Kazakhstan", code: "+7", label: "Kazakhstan (+7)", short: "KZ (+7)" },
			{ iso: "KE", name: "Kenya", code: "+254", label: "Kenya (+254)", short: "KE (+254)" },
			{ iso: "KI", name: "Kiribati", code: "+686", label: "Kiribati (+686)", short: "KI (+686)" },
			{ iso: "XK", name: "Kosovo", code: "+377", label: "Kosovo (+377)", short: "XK (+377)" },
			{ iso: "KW", name: "Kuwait", code: "+965", label: "Kuwait (+965)", short: "KW (+965)" },
			{ iso: "KG", name: "Kyrgyzstan", code: "+996", label: "Kyrgyzstan (+996)", short: "KG (+996)" },
			{ iso: "LA", name: "Laos", code: "+856", label: "Laos (+856)", short: "LA (+856)" },
			{ iso: "LV", name: "Latvia", code: "+371", label: "Latvia (+371)", short: "LV (+371)" },
			{ iso: "LB", name: "Lebanon", code: "+961", label: "Lebanon (+961)", short: "LB (+961)" },
			{ iso: "LS", name: "Lesotho", code: "+266", label: "Lesotho (+266)", short: "LS (+266)" },
			{ iso: "LR", name: "Liberia", code: "+231", label: "Liberia (+231)", short: "LR (+231)" },
			{ iso: "LY", name: "Libya", code: "+218", label: "Libya (+218)", short: "LY (+218)" },
			{ iso: "LI", name: "Liechtenstein", code: "+423", label: "Liechtenstein (+423)", short: "LI (+423)" },
			{ iso: "LT", name: "Lithuania", code: "+370", label: "Lithuania (+370)", short: "LT (+370)" },
			{ iso: "LU", name: "Luxembourg", code: "+352", label: "Luxembourg (+352)", short: "LU (+352)" },
			{ iso: "MO", name: "Macao", code: "+853", label: "Macao (+853)", short: "MO (+853)" },
			{ iso: "MG", name: "Madagascar", code: "+261", label: "Madagascar (+261)", short: "MG (+261)" },
			{ iso: "MW", name: "Malawi", code: "+265", label: "Malawi (+265)", short: "MW (+265)" },
			{ iso: "MY", name: "Malaysia", code: "+60", label: "Malaysia (+60)", short: "MY (+60)" },
			{ iso: "MV", name: "Maldives", code: "+960", label: "Maldives (+960)", short: "MV (+960)" },
			{ iso: "ML", name: "Mali", code: "+223", label: "Mali (+223)", short: "ML (+223)" },
			{ iso: "MT", name: "Malta", code: "+356", label: "Malta (+356)", short: "MT (+356)" },
			{ iso: "MH", name: "Marshall Islands", code: "+692", label: "Marshall Islands (+692)", short: "MH (+692)" },
			{ iso: "MQ", name: "Martinique", code: "+596", label: "Martinique (+596)", short: "MQ (+596)" },
			{ iso: "MR", name: "Mauritania", code: "+222", label: "Mauritania (+222)", short: "MR (+222)" },
			{ iso: "MU", name: "Mauritius", code: "+230", label: "Mauritius (+230)", short: "MU (+230)" },
			{ iso: "YT", name: "Mayotte", code: "+262", label: "Mayotte (+262)", short: "YT (+262)" },
			{ iso: "MX", name: "Mexico", code: "+52", label: "Mexico (+52)", short: "MX (+52)" },
			{ iso: "FM", name: "Micronesia", code: "+691", label: "Micronesia (+691)", short: "FM (+691)" },
			{ iso: "MD", name: "Moldova", code: "+373", label: "Moldova (+373)", short: "MD (+373)" },
			{ iso: "MC", name: "Monaco", code: "+377", label: "Monaco (+377)", short: "MC (+377)" },
			{ iso: "MN", name: "Mongolia", code: "+976", label: "Mongolia (+976)", short: "MN (+976)" },
			{ iso: "ME", name: "Montenegro", code: "+382", label: "Montenegro (+382)", short: "ME (+382)" },
			{ iso: "MS", name: "Montserrat", code: "+1664", label: "Montserrat (+1664)", short: "MS (+1664)" },
			{ iso: "MA", name: "Morocco", code: "+212", label: "Morocco (+212)", short: "MA (+212)" },
			{ iso: "MZ", name: "Mozambique", code: "+258", label: "Mozambique (+258)", short: "MZ (+258)" },
			{ iso: "MM", name: "Myanmar (Burma)", code: "+95", label: "Myanmar (Burma) (+95)", short: "MM (+95)" },
			{ iso: "NA", name: "Namibia", code: "+264", label: "Namibia (+264)", short: "NA (+264)" },
			{ iso: "NR", name: "Nauru", code: "+674", label: "Nauru (+674)", short: "NR (+674)" },
			{ iso: "NP", name: "Nepal", code: "+977", label: "Nepal (+977)", short: "NP (+977)" },
			{ iso: "NL", name: "Netherlands", code: "+31", label: "Netherlands (+31)", short: "NL (+31)" },
			{ iso: "NC", name: "New Caledonia", code: "+687", label: "New Caledonia (+687)", short: "NC (+687)" },
			{ iso: "NZ", name: "New Zealand", code: "+64", label: "New Zealand (+64)", short: "NZ (+64)" },
			{ iso: "NI", name: "Nicaragua", code: "+505", label: "Nicaragua (+505)", short: "NI (+505)" },
			{ iso: "NE", name: "Niger", code: "+227", label: "Niger (+227)", short: "NE (+227)" },
			{ iso: "NG", name: "Nigeria", code: "+234", label: "Nigeria (+234)", short: "NG (+234)" },
			{ iso: "NU", name: "Niue", code: "+683", label: "Niue (+683)", short: "NU (+683)" },
			{ iso: "NF", name: "Norfolk Island", code: "+672", label: "Norfolk Island (+672)", short: "NF (+672)" },
			{ iso: "KP", name: "North Korea", code: "+850", label: "North Korea (+850)", short: "KP (+850)" },
			{ iso: "MK", name: "North Macedonia", code: "+389", label: "North Macedonia (+389)", short: "MK (+389)" },
			{ iso: "MP", name: "Northern Mariana Islands", code: "+1670", label: "Northern Mariana Islands (+1670)", short: "MP (+1670)" },
			{ iso: "NO", name: "Norway", code: "+47", label: "Norway (+47)", short: "NO (+47)" },
			{ iso: "OM", name: "Oman", code: "+968", label: "Oman (+968)", short: "OM (+968)" },
			{ iso: "PK", name: "Pakistan", code: "+92", label: "Pakistan (+92)", short: "PK (+92)" },
			{ iso: "PW", name: "Palau", code: "+680", label: "Palau (+680)", short: "PW (+680)" },
			{ iso: "PS", name: "Palestine", code: "+970", label: "Palestine (+970)", short: "PS (+970)" },
			{ iso: "PA", name: "Panama", code: "+507", label: "Panama (+507)", short: "PA (+507)" },
			{ iso: "PG", name: "Papua New Guinea", code: "+675", label: "Papua New Guinea (+675)", short: "PG (+675)" },
			{ iso: "PY", name: "Paraguay", code: "+595", label: "Paraguay (+595)", short: "PY (+595)" },
			{ iso: "PE", name: "Peru", code: "+51", label: "Peru (+51)", short: "PE (+51)" },
			{ iso: "PH", name: "Philippines", code: "+63", label: "Philippines (+63)", short: "PH (+63)" },
			{ iso: "PN", name: "Pitcairn Islands", code: "+64", label: "Pitcairn Islands (+64)", short: "PN (+64)" },
			{ iso: "PL", name: "Poland", code: "+48", label: "Poland (+48)", short: "PL (+48)" },
			{ iso: "PT", name: "Portugal", code: "+351", label: "Portugal (+351)", short: "PT (+351)" },
			{ iso: "PR", name: "Puerto Rico", code: "+1787", label: "Puerto Rico (+1787)", short: "PR (+1787)" },
			{ iso: "QA", name: "Qatar", code: "+974", label: "Qatar (+974)", short: "QA (+974)" },
			{ iso: "CG", name: "Republic of the Congo", code: "+242", label: "Republic of the Congo (+242)", short: "CG (+242)" },
			{ iso: "RE", name: "Reunion", code: "+262", label: "Reunion (+262)", short: "RE (+262)" },
			{ iso: "RO", name: "Romania", code: "+40", label: "Romania (+40)", short: "RO (+40)" },
			{ iso: "RU", name: "Russia", code: "+7", label: "Russia (+7)", short: "RU (+7)" },
			{ iso: "RW", name: "Rwanda", code: "+250", label: "Rwanda (+250)", short: "RW (+250)" },
			{ iso: "BL", name: "Saint Barthelemy", code: "+590", label: "Saint Barthelemy (+590)", short: "BL (+590)" },
			{ iso: "SH", name: "Saint Helena", code: "+290", label: "Saint Helena (+290)", short: "SH (+290)" },
			{ iso: "KN", name: "Saint Kitts and Nevis", code: "+1869", label: "Saint Kitts and Nevis (+1869)", short: "KN (+1869)" },
			{ iso: "LC", name: "Saint Lucia", code: "+1758", label: "Saint Lucia (+1758)", short: "LC (+1758)" },
			{ iso: "MF", name: "Saint Martin", code: "+590", label: "Saint Martin (+590)", short: "MF (+590)" },
			{ iso: "PM", name: "Saint Pierre and Miquelon", code: "+508", label: "Saint Pierre and Miquelon (+508)", short: "PM (+508)" },
			{ iso: "VC", name: "Saint Vincent and the Grenadines", code: "+1784", label: "Saint Vincent and the Grenadines (+1784)", short: "VC (+1784)" },
			{ iso: "WS", name: "Samoa", code: "+685", label: "Samoa (+685)", short: "WS (+685)" },
			{ iso: "SM", name: "San Marino", code: "+378", label: "San Marino (+378)", short: "SM (+378)" },
			{ iso: "ST", name: "Sao Tome and Principe", code: "+239", label: "Sao Tome and Principe (+239)", short: "ST (+239)" },
			{ iso: "SA", name: "Saudi Arabia", code: "+966", label: "Saudi Arabia (+966)", short: "SA (+966)" },
			{ iso: "SN", name: "Senegal", code: "+221", label: "Senegal (+221)", short: "SN (+221)" },
			{ iso: "RS", name: "Serbia", code: "+381", label: "Serbia (+381)", short: "RS (+381)" },
			{ iso: "SC", name: "Seychelles", code: "+248", label: "Seychelles (+248)", short: "SC (+248)" },
			{ iso: "SL", name: "Sierra Leone", code: "+232", label: "Sierra Leone (+232)", short: "SL (+232)" },
			{ iso: "SG", name: "Singapore", code: "+65", label: "Singapore (+65)", short: "SG (+65)" },
			{ iso: "SX", name: "Sint Maarten", code: "+1721", label: "Sint Maarten (+1721)", short: "SX (+1721)" },
			{ iso: "SK", name: "Slovakia", code: "+421", label: "Slovakia (+421)", short: "SK (+421)" },
			{ iso: "SI", name: "Slovenia", code: "+386", label: "Slovenia (+386)", short: "SI (+386)" },
			{ iso: "SB", name: "Solomon Islands", code: "+677", label: "Solomon Islands (+677)", short: "SB (+677)" },
			{ iso: "SO", name: "Somalia", code: "+252", label: "Somalia (+252)", short: "SO (+252)" },
			{ iso: "ZA", name: "South Africa", code: "+27", label: "South Africa (+27)", short: "ZA (+27)" },
			{ iso: "GS", name: "South Georgia and the South Sandwich Islands", code: "+500", label: "South Georgia and the South Sandwich Islands (+500)", short: "GS (+500)" },
			{ iso: "KR", name: "South Korea", code: "+82", label: "South Korea (+82)", short: "KR (+82)" },
			{ iso: "SS", name: "South Sudan", code: "+211", label: "South Sudan (+211)", short: "SS (+211)" },
			{ iso: "ES", name: "Spain", code: "+34", label: "Spain (+34)", short: "ES (+34)" },
			{ iso: "LK", name: "Sri Lanka", code: "+94", label: "Sri Lanka (+94)", short: "LK (+94)" },
			{ iso: "SD", name: "Sudan", code: "+249", label: "Sudan (+249)", short: "SD (+249)" },
			{ iso: "SR", name: "Suriname", code: "+597", label: "Suriname (+597)", short: "SR (+597)" },
			{ iso: "SJ", name: "Svalbard and Jan Mayen", code: "+4779", label: "Svalbard and Jan Mayen (+4779)", short: "SJ (+4779)" },
			{ iso: "SE", name: "Sweden", code: "+46", label: "Sweden (+46)", short: "SE (+46)" },
			{ iso: "CH", name: "Switzerland", code: "+41", label: "Switzerland (+41)", short: "CH (+41)" },
			{ iso: "SY", name: "Syria", code: "+963", label: "Syria (+963)", short: "SY (+963)" },
			{ iso: "TW", name: "Taiwan", code: "+886", label: "Taiwan (+886)", short: "TW (+886)" },
			{ iso: "TJ", name: "Tajikistan", code: "+992", label: "Tajikistan (+992)", short: "TJ (+992)" },
			{ iso: "TZ", name: "Tanzania", code: "+255", label: "Tanzania (+255)", short: "TZ (+255)" },
			{ iso: "TH", name: "Thailand", code: "+66", label: "Thailand (+66)", short: "TH (+66)" },
			{ iso: "TG", name: "Togo", code: "+228", label: "Togo (+228)", short: "TG (+228)" },
			{ iso: "TK", name: "Tokelau", code: "+690", label: "Tokelau (+690)", short: "TK (+690)" },
			{ iso: "TO", name: "Tonga", code: "+676", label: "Tonga (+676)", short: "TO (+676)" },
			{ iso: "TT", name: "Trinidad and Tobago", code: "+1868", label: "Trinidad and Tobago (+1868)", short: "TT (+1868)" },
			{ iso: "TA", name: "Tristan da Cunha", code: "+290", label: "Tristan da Cunha (+290)", short: "TA (+290)" },
			{ iso: "TN", name: "Tunisia", code: "+216", label: "Tunisia (+216)", short: "TN (+216)" },
			{ iso: "TR", name: "Türkiye", code: "+90", label: "Türkiye (+90)", short: "TR (+90)" },
			{ iso: "TM", name: "Turkmenistan", code: "+993", label: "Turkmenistan (+993)", short: "TM (+993)" },
			{ iso: "TC", name: "Turks and Caicos Islands", code: "+1649", label: "Turks and Caicos Islands (+1649)", short: "TC (+1649)" },
			{ iso: "TV", name: "Tuvalu", code: "+688", label: "Tuvalu (+688)", short: "TV (+688)" },
			{ iso: "UM", name: "U.S. Minor Outlying Islands", code: "+1", label: "U.S. Minor Outlying Islands (+1)", short: "UM (+1)" },
			{ iso: "VI", name: "U.S. Virgin Islands", code: "+1340", label: "U.S. Virgin Islands (+1340)", short: "VI (+1340)" },
			{ iso: "UG", name: "Uganda", code: "+256", label: "Uganda (+256)", short: "UG (+256)" },
			{ iso: "UA", name: "Ukraine", code: "+380", label: "Ukraine (+380)", short: "UA (+380)" },
			{ iso: "AE", name: "United Arab Emirates", code: "+971", label: "United Arab Emirates (+971)", short: "AE (+971)" },
			{ iso: "GB", name: "United Kingdom", code: "+44", label: "United Kingdom (+44)", short: "GB (+44)" },
			{ iso: "US", name: "United States", code: "+1", label: "United States (+1)", short: "US (+1)" },
			{ iso: "UY", name: "Uruguay", code: "+598", label: "Uruguay (+598)", short: "UY (+598)" },
			{ iso: "UZ", name: "Uzbekistan", code: "+998", label: "Uzbekistan (+998)", short: "UZ (+998)" },
			{ iso: "VU", name: "Vanuatu", code: "+678", label: "Vanuatu (+678)", short: "VU (+678)" },
			{ iso: "VA", name: "Vatican City", code: "+379", label: "Vatican City (+379)", short: "VA (+379)" },
			{ iso: "VE", name: "Venezuela", code: "+58", label: "Venezuela (+58)", short: "VE (+58)" },
			{ iso: "VN", name: "Vietnam", code: "+84", label: "Vietnam (+84)", short: "VN (+84)" },
			{ iso: "WF", name: "Wallis and Futuna", code: "+681", label: "Wallis and Futuna (+681)", short: "WF (+681)" },
			{ iso: "EH", name: "Western Sahara", code: "+212", label: "Western Sahara (+212)", short: "EH (+212)" },
			{ iso: "YE", name: "Yemen", code: "+967", label: "Yemen (+967)", short: "YE (+967)" },
			{ iso: "ZM", name: "Zambia", code: "+260", label: "Zambia (+260)", short: "ZM (+260)" },
			{ iso: "ZW", name: "Zimbabwe", code: "+263", label: "Zimbabwe (+263)", short: "ZW (+263)" },
];


		var isPlaceholderOption = function(txt) {
			return txt === "please choose" || txt === "choose option" || txt === "please select" || txt === "select option";
		};
		var isTimeLike = function(txt) {
			if (!txt) return false;
			var v = txt.trim().toLowerCase();
			if (v === "activity time" || v === "time") return true;
			return /^([0-1]?\d|2[0-3]):[0-5]\d(\s?(am|pm))?$/.test(v);
		};

		var configs = [
			{
				className: "details-product-option--Activity-Date",
				modClass: "ktk-opt-date",
				placeholder: "Date"
			},
			{
				className: "details-product-option--Activity-Time",
				modClass: "ktk-opt-time",
				placeholder: "Time"
			},
			{
				className: "details-product-option--Full-Name",
				modClass: "ktk-opt-name",
				placeholder: "Full Name"
			},
			{
				className: "details-product-option--Phone-Number",
				modClass: "ktk-opt-phone",
				placeholder: "Phone Number"
			},
			{
				className: "details-product-option--Man",
				modClass: "ktk-opt-man",
				placeholder: "0",
				bottomLabel: "Man"
			},
			{
				className: "details-product-option--Woman",
				modClass: "ktk-opt-woman",
				placeholder: "0",
				bottomLabel: "Woman"
			},
			{
				className: "details-product-option--Cocktails-Add-On",
				modClass: "ktk-opt-addon-cocktails",
				placeholder: "Cocktails Add-On"
			},
			{
				className: "details-product-option--T-Shirts-Add-On",
				modClass: "ktk-opt-addon-tshirts",
				placeholder: "T-Shirts Add-On"
			},
			{
				className: "details-product-option--Instant-Photos-Add-On",
				modClass: "ktk-opt-addon-photos",
				placeholder: "Instant Photos Add-On"
			}
		];

		// Always clear previous hide state before applying fresh rules.
		var allRowsReset = root.querySelectorAll(".details-product-option, .product-details-module, .ktk-hide-option-row, .ktk-empty-select");
		for (var rr = 0; rr < allRowsReset.length; rr += 1) {
			allRowsReset[rr].classList.remove("ktk-hide-option-row", "ktk-empty-select");
		}

		for (var i = 0; i < configs.length; i += 1) {
			var cfg = configs[i];
			var node = root.querySelector("." + cfg.className);
			if (!node) continue;

			node.classList.add("ktk-opt-card", cfg.modClass);
			node.classList.remove("ktk-empty-select", "ktk-hide-option-row");
			if (cfg.bottomLabel) {
				node.setAttribute("data-ktk-bottom-label", cfg.bottomLabel);
			}

			var input = node.querySelector("input, textarea");
			if (input && cfg.placeholder) input.setAttribute("placeholder", cfg.placeholder);
			var select = node.querySelector("select");
			if (select) {
				for (var si = 0; si < select.options.length; si += 1) {
					var opt = select.options[si];
					if (!opt) continue;
					var txt = (opt.textContent || "").trim().toLowerCase();
					if (isPlaceholderOption(txt)) {
						if (select.selectedIndex === si) {
							// For Activity Time dropdown, keep the placeholder option selected by default.
							if (cfg.modClass === "ktk-opt-time") {
								try { select.selectedIndex = 0; } catch (e) {}
							} else if (cfg.modClass === "ktk-opt-man" || cfg.modClass === "ktk-opt-woman") {
								var selected = false;
								for (var zi = 0; zi < select.options.length; zi += 1) {
									var ztxt = ((select.options[zi] && select.options[zi].textContent) || "").trim();
									if (ztxt === "0") {
										try { select.selectedIndex = zi; } catch (e) {}
										selected = true;
										break;
									}
								}
								if (!selected) {
									try { select.selectedIndex = (select.options.length > 1 ? 1 : 0); } catch (e) {}
								}
							} else {
								try { select.selectedIndex = -1; } catch (e) {}
							}
						}
						// Keep a friendly label in placeholder row instead of blank box.
						if (cfg.modClass === "ktk-opt-man" || cfg.modClass === "ktk-opt-woman") {
							opt.textContent = "0";
							opt.label = "0";
						} else {
							opt.textContent = cfg.placeholder || "Select";
							opt.label = cfg.placeholder || "Select";
						}
						continue;
					}
				}

				// Ecwid select-type options often render a readonly text input + native select.
				// Keep one visual box (readonly input), but keep native select for interaction.
				if (cfg.modClass === "ktk-opt-time") {
					var firstOpt = select.options && select.options.length ? select.options[0] : null;
					if (firstOpt) {
						var firstTxt = (firstOpt.textContent || "").trim().toLowerCase();
						if (!firstTxt || isPlaceholderOption(firstTxt)) {
							firstOpt.textContent = "Time";
							firstOpt.label = "Time";
						}
					}
					// Only default to "Time" when nothing meaningful is selected.
					if (select.options && select.options.length) {
						var keepCurrent = false;
						if (select.selectedIndex > 0) {
							keepCurrent = true;
						} else if (select.selectedIndex === 0 && select.options[0]) {
							var s0 = (select.options[0].textContent || "").trim().toLowerCase();
							keepCurrent = !isPlaceholderOption(s0);
						}
						if (!keepCurrent && select.selectedIndex < 0) {
							try { select.selectedIndex = 0; } catch (e) {}
						}
					}

					var ghostInput = node.querySelector("input.form-control__text");
					var syncTimeInput = function() {
						if (!ghostInput) return;
						var txt = "";
						if (select.selectedIndex >= 0 && select.options[select.selectedIndex]) {
							txt = (select.options[select.selectedIndex].textContent || "").trim();
						}
						if (!txt || isPlaceholderOption(txt.toLowerCase())) {
							txt = "Time";
						}
						ghostInput.value = txt;
						ghostInput.setAttribute("placeholder", "Time");
					};
					syncTimeInput();
					if (!select.dataset.ktkTimeBound) {
						select.addEventListener("change", syncTimeInput);
						select.addEventListener("input", syncTimeInput);
						select.dataset.ktkTimeBound = "1";
					}
				}
			}
			var textLike = node.querySelector(".form-control__text");
			if (textLike) {
				var raw = (textLike.textContent || "").trim().toLowerCase();
				if (raw.indexOf("please choose") !== -1 || raw.indexOf("enter your text") !== -1) {
					textLike.textContent = "";
					textLike.classList.add("ktk-helper-hidden");
					textLike.setAttribute("aria-hidden", "true");
				}
			}
			if (cfg.modClass === "ktk-opt-phone" && input) {
				input.setAttribute("type", "tel");
				input.setAttribute("autocomplete", "tel");
				input.setAttribute("placeholder", "Phone Number");

				var content = node.querySelector(".product-details-module__content") || node;
				var existingWrap = content.querySelector(".ktk-phone-wrap");
				var phoneInput = input;
				var countrySelect = content.querySelector(".ktk-phone-code");
				var previousCode = countrySelect && countrySelect.value ? countrySelect.value : "+48";

				if (!countrySelect) {
					countrySelect = document.createElement("select");
					countrySelect.className = "ktk-phone-code";
				}
				if (!countrySelect.dataset.ktkCountriesLoaded) {
					countrySelect.innerHTML = "";
					for (var pci = 0; pci < phoneCountryOptions.length; pci += 1) {
						var c = phoneCountryOptions[pci];
						var op = document.createElement("option");
						op.value = c.code;
						op.textContent = c.label;
						op.setAttribute("data-short", c.short || (c.iso + " (" + c.code + ")"));
						if (c.code === previousCode) op.selected = true;
						countrySelect.appendChild(op);
					}
					if (!countrySelect.value && countrySelect.options.length) {
						countrySelect.value = "+48";
					}
					countrySelect.dataset.ktkCountriesLoaded = "1";
				}

				var countryShell = content.querySelector(".ktk-phone-select-shell");
				if (!countryShell) {
					countryShell = document.createElement("div");
					countryShell.className = "ktk-phone-select-shell";
				}
				var countryDisplay = countryShell.querySelector(".ktk-phone-code-display");
				if (!countryDisplay) {
					countryDisplay = document.createElement("span");
					countryDisplay.className = "ktk-phone-code-display";
				}
				if (countrySelect.parentNode !== countryShell) {
					countryShell.appendChild(countrySelect);
				}
				if (!countryShell.contains(countryDisplay)) {
					countryShell.appendChild(countryDisplay);
				}

				if (!existingWrap) {
					var wrap = document.createElement("div");
					wrap.className = "ktk-phone-wrap";
					phoneInput.parentNode.insertBefore(wrap, phoneInput);
					wrap.appendChild(countryShell);
					wrap.appendChild(phoneInput);
				} else {
					if (!existingWrap.contains(countryShell)) existingWrap.insertBefore(countryShell, existingWrap.firstChild);
					if (!existingWrap.contains(phoneInput)) existingWrap.appendChild(phoneInput);
				}

				var syncCountryDisplay = function() {
					if (!countrySelect || !countryDisplay) return;
					var selectedOpt = countrySelect.options[countrySelect.selectedIndex];
					if (!selectedOpt) {
						countryDisplay.textContent = "PL (+48)";
						return;
					}
					countryDisplay.textContent = selectedOpt.getAttribute("data-short") || "PL (+48)";
				};

				var ensurePhonePrefix = function(forceIfEmpty) {
					if (!phoneInput || !countrySelect) return;
					var code = countrySelect.value || "+48";
					var prefix = code + " ";
					var raw = (phoneInput.value || "").trim();
					if (!raw) {
						if (forceIfEmpty) phoneInput.value = prefix;
						return;
					}
					if (raw.indexOf(prefix) === 0) {
						return;
					}
					if (/^\+\d{1,15}\s*/.test(raw)) {
						phoneInput.value = raw.replace(/^\+\d{1,15}\s*/, prefix);
						return;
					}
					phoneInput.value = prefix + raw;
				};

				var sanitizePhoneDigits = function() {
					if (!phoneInput || !countrySelect) return;
					var code = countrySelect.value || "+48";
					var prefix = code + " ";
					var raw = phoneInput.value || "";
					var tail = raw;
					if (tail.indexOf(prefix) === 0) {
						tail = tail.slice(prefix.length);
					} else if (tail.indexOf(code) === 0) {
						tail = tail.slice(code.length).replace(/^\s+/, "");
					} else if (/^\+\d{1,15}\s*/.test(tail)) {
						tail = tail.replace(/^\+\d{1,15}\s*/, "");
					}
					tail = tail.replace(/\D+/g, "");
					phoneInput.value = prefix + tail;
				};

				var normalizePhoneForSubmit = function() {
					if (!phoneInput || !countrySelect) return;
					var code = countrySelect.value || "+48";
					var raw = (phoneInput.value || "").trim();
					if (!raw) {
						phoneInput.value = code;
						return;
					}
					// Keep leading + and digits only, remove whitespace separators.
					var normalized = raw.replace(/\s+/g, "");
					if (normalized.indexOf("+") !== 0) {
						normalized = code + normalized.replace(/^\+/, "");
					}
					if (normalized.indexOf(code) !== 0) {
						normalized = normalized.replace(/^\+\d{1,15}/, code);
					}
					phoneInput.value = normalized;
				};

				var keepCaretAfterPrefix = function() {
					if (!phoneInput || !countrySelect) return;
					var prefix = (countrySelect.value || "+48") + " ";
					var minPos = prefix.length;
					try {
						var s = phoneInput.selectionStart;
						var e = phoneInput.selectionEnd;
						if (typeof s !== "number" || typeof e !== "number") return;
						if (s < minPos || e < minPos) {
							phoneInput.setSelectionRange(minPos, minPos);
						}
					} catch (err) {}
				};
				syncCountryDisplay();

				if (!phoneInput.dataset.ktkPhoneCodeBound) {
					countrySelect.addEventListener("change", function() {
						ensurePhonePrefix(true);
						syncCountryDisplay();
						keepCaretAfterPrefix();
					});
					countrySelect.addEventListener("input", syncCountryDisplay);
					phoneInput.addEventListener("focus", function() {
						ensurePhonePrefix(true);
						setTimeout(keepCaretAfterPrefix, 0);
					});
					phoneInput.addEventListener("click", keepCaretAfterPrefix);
					phoneInput.addEventListener("mouseup", keepCaretAfterPrefix);
					phoneInput.addEventListener("keyup", keepCaretAfterPrefix);
					phoneInput.addEventListener("keydown", function(e) {
						var prefix = (countrySelect.value || "+48") + " ";
						var minPos = prefix.length;
						var start = typeof phoneInput.selectionStart === "number" ? phoneInput.selectionStart : 0;
						var end = typeof phoneInput.selectionEnd === "number" ? phoneInput.selectionEnd : start;
						var isMeta = !!(e.ctrlKey || e.metaKey || e.altKey);

						// Block deletion of prefix by keyboard.
						if (e.key === "Backspace") {
							if (start <= minPos || (start < end && start < minPos)) {
								e.preventDefault();
								keepCaretAfterPrefix();
								return;
							}
						}
						if (e.key === "Delete") {
							if (start < minPos || (start < end && start < minPos)) {
								e.preventDefault();
								keepCaretAfterPrefix();
								return;
							}
						}

						// Block typing into the prefix area or non-digit typing after prefix.
						if (!isMeta && e.key && e.key.length === 1) {
							if (start < minPos) {
								e.preventDefault();
								keepCaretAfterPrefix();
								return;
							}
							if (!/[0-9]/.test(e.key)) {
								e.preventDefault();
								return;
							}
						}
					});
					phoneInput.addEventListener("cut", function(e) {
						var prefix = (countrySelect.value || "+48") + " ";
						var minPos = prefix.length;
						var start = typeof phoneInput.selectionStart === "number" ? phoneInput.selectionStart : 0;
						if (start < minPos) {
							e.preventDefault();
							keepCaretAfterPrefix();
						}
					});
					phoneInput.addEventListener("input", function() {
						ensurePhonePrefix(true);
						sanitizePhoneDigits();
						keepCaretAfterPrefix();
					});
					phoneInput.addEventListener("blur", function() {
						ensurePhonePrefix(true);
						sanitizePhoneDigits();
					});

					var submitButtons = document.querySelectorAll(
						".details-product-purchase__add-buttons .form-control__button, " +
						".details-product-purchase__controls .form-control__button, " +
						".details-product-purchase__add-buttons button, " +
						".details-product-purchase__controls button"
					);
					for (var sb = 0; sb < submitButtons.length; sb += 1) {
						var btn = submitButtons[sb];
						if (!btn || btn.dataset.ktkPhoneNormalizedBound) continue;
						btn.addEventListener("click", normalizePhoneForSubmit, true);
						btn.dataset.ktkPhoneNormalizedBound = "1";
					}

					var nearestForm = phoneInput.closest ? phoneInput.closest("form") : null;
					if (nearestForm && !nearestForm.dataset.ktkPhoneNormalizedBound) {
						nearestForm.addEventListener("submit", normalizePhoneForSubmit, true);
						nearestForm.dataset.ktkPhoneNormalizedBound = "1";
					}

					phoneInput.dataset.ktkPhoneCodeBound = "1";
				}
			}
			if (cfg.modClass === "ktk-opt-name" && input) {
				input.setAttribute("autocomplete", "name");
			}

			var noisyBits = node.querySelectorAll(".form-control__placeholder, .form-control__placeholder-inner, [class*='icon']");
			for (var n = 0; n < noisyBits.length; n += 1) {
				var bit = noisyBits[n];
				if (!bit) continue;
				var cls = (bit.className || "").toString().toLowerCase();
				if (cls.indexOf("icon") !== -1 || cls.indexOf("placeholder") !== -1) {
					bit.classList.add("ktk-helper-hidden");
					bit.setAttribute("aria-hidden", "true");
				}
			}

			var tinyGlyphs = node.querySelectorAll("*");
			for (var g = 0; g < tinyGlyphs.length; g += 1) {
				var glyph = tinyGlyphs[g];
				if (!glyph || glyph.children.length) continue;
				var t = (glyph.textContent || "").trim();
				if (t === "\u2304" || t === "\u2228" || t === "\u25BE" || t === "\u25BD" || t === "\u2303") {
					glyph.classList.add("ktk-helper-hidden");
					glyph.setAttribute("aria-hidden", "true");
				}
			}
		}

		var rootGlyphs = root.querySelectorAll("*");
		for (var rg = 0; rg < rootGlyphs.length; rg += 1) {
			var nodeGlyph = rootGlyphs[rg];
			if (!nodeGlyph || nodeGlyph.children.length) continue;
			var gt = (nodeGlyph.textContent || "").trim();
			if (gt === "\u2304" || gt === "\u2228" || gt === "\u25BE" || gt === "\u25BD" || gt === "\u2303" || gt === "\u02c5" || gt === "\u2335") {
				nodeGlyph.classList.add("ktk-helper-hidden");
				nodeGlyph.setAttribute("aria-hidden", "true");
			}
		}

		// Dedupe time rows: only hide an explicit Activity Time text row when next row is a time dropdown.
		var optionRows = root.querySelectorAll(".details-product-option");

		for (var oi = 0; oi < optionRows.length; oi += 1) {
			var optRow = optionRows[oi];
			if (!optRow) continue;
			var optClass = ((optRow.className || "") + "").toLowerCase();
			var optText = ((optRow.textContent || "") + "").replace(/\s+/g, " ").toLowerCase();
			if (optClass.indexOf("cocktails-add-on") !== -1 || optText.indexOf("cocktails add-on") !== -1) {
				optRow.classList.add("ktk-opt-addon-cocktails");
			}
			if (optClass.indexOf("t-shirts-add-on") !== -1 || optClass.indexOf("tshirts-add-on") !== -1 || optText.indexOf("t-shirts add-on") !== -1 || optText.indexOf("t shirts add-on") !== -1) {
				optRow.classList.add("ktk-opt-addon-tshirts");
			}
			if (optClass.indexOf("instant-photos-add-on") !== -1 || optText.indexOf("instant photos add-on") !== -1) {
				optRow.classList.add("ktk-opt-addon-photos");
			}
		}
		for (var ri = 0; ri < optionRows.length - 1; ri += 1) {
			var rowA = optionRows[ri];
			var rowB = optionRows[ri + 1];
			if (!rowA || !rowB) continue;
			if (rowA.classList.contains("ktk-hide-option-row")) continue;

			var aInput = rowA.querySelector("input, textarea");
			var bSelect = rowB.querySelector("select");
			if (!aInput || !bSelect) continue;

			var aVal = (aInput.value || aInput.getAttribute("placeholder") || "").trim();
			var bTxt = "";
			if (bSelect.options && bSelect.options.length) {
				var bi = bSelect.selectedIndex >= 0 ? bSelect.selectedIndex : 0;
				if (bSelect.options[bi]) bTxt = (bSelect.options[bi].textContent || "").trim();
			}

			var hasTimeOption = false;
			if (bSelect.options) {
				for (var bo = 0; bo < bSelect.options.length; bo += 1) {
					var bot = (bSelect.options[bo].textContent || "").trim();
					if (isTimeLike(bot)) {
						hasTimeOption = true;
						break;
					}
				}
			}

			var rowAText = (rowA.textContent || "").trim().toLowerCase();
			var isActivityTimeRow = rowAText.indexOf("activity time") !== -1;
			if (isActivityTimeRow) {
				rowA.classList.add("ktk-hide-option-row");
				rowB.classList.add("ktk-opt-card", "ktk-opt-time");
				var b0 = bSelect.options && bSelect.options.length ? bSelect.options[0] : null;
				if (b0) {
					var b0txt = (b0.textContent || "").trim().toLowerCase();
					if (!b0txt || isPlaceholderOption(b0txt)) {
						b0.textContent = "Time";
						b0.label = "Time";
					}
				}
			}
		}

		// No broad fallback row hiding: keeps Activity Date safe.
		// Hard fallback: if a row is text-input based and reads "Activity Time", hide it.
		var fallbackRows = root.querySelectorAll(".details-product-option, .product-details-module");
		for (var fr = 0; fr < fallbackRows.length; fr += 1) {
			var frow = fallbackRows[fr];
			if (!frow) continue;
			var hasSelect = !!frow.querySelector("select");
			var hasTextInput = !!frow.querySelector("input, textarea");
			if (hasSelect || !hasTextInput) continue;
			var ftxt = (frow.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
			if (ftxt.indexOf("activity time") !== -1) {
				frow.classList.add("ktk-hide-option-row");
			}
		}

		// Add custom email + proceed control (idempotent)
		var optionsContainer = root.querySelector(".product-details__product-options") || root;
		if (optionsContainer) {
			var findOptionRow = function(selectors, fallbackTextNeedle) {
				for (var fs = 0; fs < selectors.length; fs += 1) {
					var foundBySelector = optionsContainer.querySelector(selectors[fs]);
					if (foundBySelector) return foundBySelector;
				}
				if (!fallbackTextNeedle) return null;
				var rows = optionsContainer.querySelectorAll(".details-product-option, .product-details-module");
				var needle = String(fallbackTextNeedle).toLowerCase();
				for (var frx = 0; frx < rows.length; frx += 1) {
					var txt = (rows[frx].textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
					if (txt.indexOf(needle) !== -1) return rows[frx];
				}
				return null;
			};

			var manRow = optionsContainer.querySelector(".ktk-opt-man");
			var womanRow = optionsContainer.querySelector(".ktk-opt-woman");
			if (manRow && womanRow) {
				var genderWrap = optionsContainer.querySelector(".ktk-gender-row");
				if (!genderWrap) {
					genderWrap = document.createElement("div");
					genderWrap.className = "ktk-gender-row";
					optionsContainer.insertBefore(genderWrap, manRow);
				}
				if (manRow.parentNode !== genderWrap) genderWrap.appendChild(manRow);
				if (womanRow.parentNode !== genderWrap) genderWrap.appendChild(womanRow);
			}

			var dateRow = optionsContainer.querySelector(".ktk-opt-date");
			var timeRow = optionsContainer.querySelector(".ktk-opt-time");
			if (dateRow && timeRow) {
				var dtWrap = optionsContainer.querySelector(".ktk-datetime-row");
				if (!dtWrap) {
					dtWrap = document.createElement("div");
					dtWrap.className = "ktk-datetime-row";
					optionsContainer.insertBefore(dtWrap, dateRow);
				}
				if (dateRow.parentNode !== dtWrap) dtWrap.appendChild(dateRow);
				if (timeRow.parentNode !== dtWrap) dtWrap.appendChild(timeRow);
			}

			var setImp = function(el, prop, value) {
				if (!el || !el.style) return;
				el.style.setProperty(prop, value, "important");
			};
			var closestOptionRow = function(el) {
				if (!el) return null;
				if (typeof el.closest === "function") {
					return el.closest(".details-product-option, .product-details-module");
				}
				return null;
			};
			var ADDON_FIELDS = [
				{ key: "cocktails", label: "Cocktails Add-On", cls: "ktk-opt-addon-cocktails" },
				{ key: "tshirts", label: "T-Shirts Add-On", cls: "ktk-opt-addon-tshirts" },
				{ key: "photos", label: "Instant Photos Add-On", cls: "ktk-opt-addon-photos" }
			];
			var normalizeText = function(value) {
				return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
			};
			var controlMatchesLabel = function(ctrl, labelNeedle) {
				if (!ctrl || !labelNeedle) return false;
				var labelAttr = normalizeText(ctrl.getAttribute("aria-label"));
				var nameAttr = normalizeText(ctrl.getAttribute("name"));
				var phAttr = normalizeText(ctrl.getAttribute("placeholder"));
				return (
					labelAttr === labelNeedle ||
					nameAttr === labelNeedle ||
					(labelAttr && labelAttr.indexOf(labelNeedle) !== -1) ||
					(nameAttr && nameAttr.indexOf(labelNeedle) !== -1) ||
					(phAttr && phAttr.indexOf(labelNeedle) !== -1)
				);
			};
			var rowMatchesAddonField = function(row, field) {
				if (!row || !field) return false;
				var rowClass = normalizeText(row.className);
				var rowText = normalizeText(row.textContent);
				var labelNeedle = normalizeText(field.label);
				var keyNeedle = normalizeText(field.key);
				var dashNeedle = labelNeedle.replace(/\s+/g, "-");
				if (
					rowClass.indexOf(dashNeedle) !== -1 ||
					rowClass.indexOf(keyNeedle) !== -1 ||
					rowText.indexOf(labelNeedle) !== -1
				) {
					return true;
				}
				var controls = row.querySelectorAll("select, input");
				for (var ci = 0; ci < controls.length; ci += 1) {
					var ctrl = controls[ci];
					if (controlMatchesLabel(ctrl, labelNeedle)) return true;
				}
				return false;
			};
			var locateAddonRow = function(field) {
				if (!field) return null;
				var labelNeedle = normalizeText(field.label);

				if (field.label) {
					var safe = String(field.label).replace(/"/g, '\\"');
					var controls = optionsContainer.querySelectorAll(
						'select[aria-label="' + safe + '"], select[name="' + safe + '"], input[aria-label="' + safe + '"], input[name="' + safe + '"]'
					);
					for (var ci = 0; ci < controls.length; ci += 1) {
						var ctrlRow = closestOptionRow(controls[ci]);
						if (ctrlRow) return ctrlRow;
					}
				}

				// Broad control scan for dynamic Ecwid markup variants.
				var allCtrls = optionsContainer.querySelectorAll("select, input");
				for (var ac = 0; ac < allCtrls.length; ac += 1) {
					if (!controlMatchesLabel(allCtrls[ac], labelNeedle)) continue;
					var anyRow = closestOptionRow(allCtrls[ac]);
					if (anyRow) return anyRow;
				}

				var rows = optionsContainer.querySelectorAll(".details-product-option, .product-details-module");
				for (var ri = 0; ri < rows.length; ri += 1) {
					var row = rows[ri];
					if (rowMatchesAddonField(row, field)) return row;
				}

				var wrapped = optionsContainer.querySelectorAll(".ktk-addons-row .details-product-option, .ktk-addons-row .product-details-module");
				for (var wi = 0; wi < wrapped.length; wi += 1) {
					var wrow = wrapped[wi];
					if (rowMatchesAddonField(wrow, field)) return wrow;
				}

				if (!field.label) return null;
				var safe = String(field.label).replace(/"/g, '\\"');
				var fallbackControls = optionsContainer.querySelectorAll(
					'select[aria-label="' + safe + '"], select[name="' + safe + '"], input[aria-label="' + safe + '"], input[name="' + safe + '"]'
				);
				for (var fi = 0; fi < fallbackControls.length; fi += 1) {
					var ctrlRow = closestOptionRow(fallbackControls[fi]);
					if (ctrlRow) return ctrlRow;
				}
				return null;
			};
			var enforceAddonRowLayout = function() {
				var addonRows = [];
				var seen = [];
				for (var fi = 0; fi < ADDON_FIELDS.length; fi += 1) {
					var found = locateAddonRow(ADDON_FIELDS[fi]);
					if (!found || seen.indexOf(found) !== -1) continue;
					seen.push(found);
					addonRows.push({ field: ADDON_FIELDS[fi], row: found });
				}
				if (!addonRows.length) return null;

				var addonsWrap = optionsContainer.querySelector(".ktk-addons-row");
				if (!addonsWrap) {
					addonsWrap = document.createElement("div");
					addonsWrap.className = "ktk-addons-row";
				}

				// Always anchor wrapper before first add-on row so Ecwid redraw order cannot push it below.
				var firstRow = addonRows[0].row;
				if (addonsWrap.parentNode !== optionsContainer || addonsWrap !== firstRow.previousSibling) {
					optionsContainer.insertBefore(addonsWrap, firstRow);
				}

				// Keep a deterministic order: cocktails -> t-shirts -> photos.
				addonRows.sort(function(a, b) {
					return ADDON_FIELDS.indexOf(a.field) - ADDON_FIELDS.indexOf(b.field);
				});

				for (var ai = 0; ai < addonRows.length; ai += 1) {
					var item = addonRows[ai];
					var row = item.row;
					row.classList.add("ktk-opt-addon", item.field.cls);
					row.classList.remove("ktk-hide-option-row");
					if (row.parentNode !== addonsWrap) addonsWrap.appendChild(row);
					// Important: avoid inline display/width forcing; Ecwid may redraw rows and
					// inline !important can break fallback one-row layout outside wrapper.
					row.style.removeProperty("display");
					row.style.removeProperty("width");
					row.style.removeProperty("min-width");
					row.style.removeProperty("margin");
				}

				setImp(addonsWrap, "display", "grid");
				setImp(addonsWrap, "grid-template-columns", "repeat(3, minmax(0, 1fr))");
				setImp(addonsWrap, "gap", "10px");
				setImp(addonsWrap, "margin", "0 0 12px 0");
				addonsWrap.dataset.ktkAddonGrouped = "1";

				return addonsWrap;
			};
			enforceAddonRowLayout();
			var addonGroupAttempts = 0;
			var scheduleAddonGrouping = function() {
				enforceAddonRowLayout();
				addonGroupAttempts += 1;
				if (addonGroupAttempts < 140) {
					setTimeout(scheduleAddonGrouping, 120);
				}
			};
			scheduleAddonGrouping();

			var phoneRow = optionsContainer.querySelector(".ktk-opt-phone");
			var addonsWrapForAnchor = enforceAddonRowLayout() || optionsContainer.querySelector(".ktk-addons-row");
			var anchor = phoneRow ? phoneRow.nextSibling : null;
			if (addonsWrapForAnchor) {
				anchor = addonsWrapForAnchor.nextSibling;
			}

			var emailRow = optionsContainer.querySelector(".ktk-opt-email");
			if (!emailRow) {
				emailRow = document.createElement("div");
				emailRow.className = "details-product-option ktk-opt-card ktk-opt-email";
				emailRow.innerHTML =
					'<div class="product-details-module__content">' +
						'<input type="email" class="ktk-email-input" placeholder="Email Address" autocomplete="email" inputmode="email">' +
					'</div>';
				if (anchor) optionsContainer.insertBefore(emailRow, anchor);
				else optionsContainer.appendChild(emailRow);
			}
			// Keep email row after add-ons when add-ons are present (also on rerenders).
			var addonsWrapAfterEmail = optionsContainer.querySelector(".ktk-addons-row");
			if (emailRow && addonsWrapAfterEmail && emailRow.previousSibling !== addonsWrapAfterEmail) {
				if (addonsWrapAfterEmail.nextSibling) optionsContainer.insertBefore(emailRow, addonsWrapAfterEmail.nextSibling);
				else optionsContainer.appendChild(emailRow);
			}

			var goRow = optionsContainer.querySelector(".ktk-opt-go");
			if (!goRow) {
				goRow = document.createElement("div");
				goRow.className = "details-product-option ktk-opt-card ktk-opt-go";
				goRow.innerHTML =
					'<div class="product-details-module__content">' +
						'<div class="ktk-go-wrap">' +
							'<button type="button" class="ktk-go-btn"><span class="ktk-go-label">LET\'S GO!</span><span class="ktk-go-arrow" aria-hidden="true">➜</span></button>' +
						'</div>' +
					'</div>';
				optionsContainer.appendChild(goRow);
			}

			var goBtn = goRow.querySelector(".ktk-go-btn");
			if (goBtn) goBtn.innerHTML = '<span class="ktk-go-label">LET\'S GO!</span><span class="ktk-go-arrow" aria-hidden="true">➜</span>';
			if (goBtn && !goBtn.dataset.ktkBound) {
				goBtn.addEventListener("click", function(e) {
					e.preventDefault();
					var cta =
						document.querySelector(".details-product-purchase__add-buttons .form-control__button:not([disabled])") ||
						document.querySelector(".details-product-purchase__controls .form-control__button:not([disabled])") ||
						document.querySelector(".details-product-purchase__add-buttons button:not([disabled])") ||
						document.querySelector(".details-product-purchase__controls button:not([disabled])");
					if (cta) cta.click();
				});
				goBtn.dataset.ktkBound = "1";
			}
			enforceAddonRowLayout();
		}
		bindBalanceUpdater();
	}

	function bindOptionsObserver() {
		var root = document.getElementById(OPTIONS_MOUNT_ID);
		if (!root) return;
		if (optionsObserver && optionsObserverRoot === root) return;

		if (optionsObserver) {
			optionsObserver.disconnect();
			optionsObserver = null;
			optionsObserverRoot = null;
		}

		var pending = false;
		optionsObserver = new MutationObserver(function() {
			if (pending) return;
			pending = true;
			setTimeout(function() {
				pending = false;
				if (!isTargetPage()) return;
				moveRealEcwidOptions();
				personalizeOptions();
				updateBalanceDisplay();
				bindStageButton();
			}, 80);
		});

		optionsObserver.observe(root, { childList: true, subtree: true });
		optionsObserverRoot = root;
	}

	function isEditableTarget(target) {
		if (!target) return false;
		if (target.closest && target.closest("#ktk-bf-options-live")) return true;
		var tag = (target.tagName || "").toLowerCase();
		if (tag === "input" || tag === "textarea" || tag === "select") return true;
		if (target.isContentEditable) return true;
		return !!target.closest("input, textarea, select, [contenteditable='true']");
	}

	function setStage(stage) {
		var canvas = document.getElementById(CONTAINER_ID);
		if (!canvas) return;
		currentStage = stage ? 1 : 0;
		canvas.classList.toggle("ktk-bf-show-options", currentStage === 1);
		var nextBtn = document.getElementById(NEXT_BUTTON_ID);
		if (nextBtn) nextBtn.classList.toggle("is-hidden", currentStage === 1);
		var prevBtn = document.getElementById(PREV_BUTTON_ID);
		if (prevBtn) prevBtn.classList.toggle("is-hidden", currentStage === 0);
	}

	function bindStageButton() {
		var nextBtn = document.getElementById(NEXT_BUTTON_ID);
		var prevBtn = document.getElementById(PREV_BUTTON_ID);
		if (!nextBtn && !prevBtn) return;
		if (nextBtn) nextBtn.classList.toggle("is-hidden", currentStage === 1);
		if (prevBtn) prevBtn.classList.toggle("is-hidden", currentStage === 0);

		var goNext = function(e) {
			if (e) e.preventDefault();
			setStage(1);
		};
		var goPrev = function(e) {
			if (e) e.preventDefault();
			setStage(0);
		};

		if (nextBtn && !nextBtn.dataset.ktkBound) {
			nextBtn.addEventListener("click", goNext);
			nextBtn.addEventListener("touchstart", goNext, { passive: false });
			nextBtn.addEventListener("pointerdown", goNext);
			nextBtn.dataset.ktkBound = "1";
		}
		if (prevBtn && !prevBtn.dataset.ktkBound) {
			prevBtn.addEventListener("click", goPrev);
			prevBtn.addEventListener("touchstart", goPrev, { passive: false });
			prevBtn.addEventListener("pointerdown", goPrev);
			prevBtn.dataset.ktkBound = "1";
		}

		if (!stageDelegateBound) {
			document.addEventListener("click", function(e) {
				var target = e.target && e.target.closest ? e.target.closest("#" + NEXT_BUTTON_ID + ",#" + PREV_BUTTON_ID) : null;
				if (!target) return;
				e.preventDefault();
				if (target.id === NEXT_BUTTON_ID) setStage(1);
				if (target.id === PREV_BUTTON_ID) setStage(0);
			}, true);
			stageDelegateBound = true;
		}
	}

	function bindGestureTransition() {
		if (gestureBound) return;

		var onWheel = function(e) {
			if (!isTargetPage()) return;
			if (isEditableTarget(e.target)) return;
			if (wheelLock) {
				e.preventDefault();
				return;
			}
			if (Math.abs(e.deltaY) < 12) return;
			e.preventDefault();
			wheelLock = true;
			setStage(e.deltaY > 0 ? 1 : 0);
			setTimeout(function() {
				wheelLock = false;
			}, 420);
		};

		var onTouchStart = function(e) {
			if (!isTargetPage()) return;
			if (!e.touches || !e.touches.length) return;
			touchStartY = e.touches[0].clientY;
		};

		var onTouchMove = function(e) {
			if (!isTargetPage()) return;
			if (isEditableTarget(e.target)) return;
			if (touchStartY === null || !e.touches || !e.touches.length) return;
			var dy = touchStartY - e.touches[0].clientY;
			if (Math.abs(dy) < 28) return;
			e.preventDefault();
			setStage(dy > 0 ? 1 : 0);
			touchStartY = null;
		};

		var onTouchEnd = function() {
			touchStartY = null;
		};

		var onKey = function(e) {
			if (!isTargetPage()) return;
			if (isEditableTarget(e.target)) return;
			var down = e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ";
			var up = e.key === "ArrowUp" || e.key === "PageUp";
			if (!down && !up) return;
			e.preventDefault();
			setStage(down ? 1 : 0);
		};

		window.addEventListener("wheel", onWheel, { passive: false });
		window.addEventListener("touchstart", onTouchStart, { passive: true });
		window.addEventListener("touchmove", onTouchMove, { passive: false });
		window.addEventListener("touchend", onTouchEnd, { passive: true });
		window.addEventListener("keydown", onKey);

		gestureCleanup.push(function() { window.removeEventListener("wheel", onWheel); });
		gestureCleanup.push(function() { window.removeEventListener("touchstart", onTouchStart); });
		gestureCleanup.push(function() { window.removeEventListener("touchmove", onTouchMove); });
		gestureCleanup.push(function() { window.removeEventListener("touchend", onTouchEnd); });
		gestureCleanup.push(function() { window.removeEventListener("keydown", onKey); });

		gestureBound = true;
		setStage(currentStage);
	}

	function renderCanvas() {
		var enabled = isTargetPage();
		setTargetClass(enabled);
		if (!enabled) {
			removeCanvas();
			lastRenderSignature = "";
			return;
		}

		var canvas = getOrCreateCanvas();
		if (!canvas) return;

		var title = extractTitle();
		var image = extractImage();
		var description = extractDescriptionHtml(title);
		var signature = [title, image, description].join("|");

		if (signature === lastRenderSignature) return;
		lastRenderSignature = signature;

		canvas.innerHTML =
			'<div class="ktk-bf-row">' +
				'<div class="ktk-bf-left">' +
					'<img src="' + image + '" alt="' + title.replace(/"/g, '&quot;') + '" loading="eager" onerror="this.onerror=null;this.src=\'' + FALLBACK_IMAGE + '\'">' +
				'</div>' +
				'<div class="ktk-bf-right">' +
					'<h2>' + title + '</h2>' +
					'<div class="ktk-bf-description">' + description + '</div>' +
				'</div>' +
			'</div>' +
			'<section class="ktk-bf-options">' +
				'<div class="ktk-bf-options-top">' +
					'<div id="' + BALANCE_ID + '" class="ktk-bf-balance">0.00 zł</div>' +
					'<button id="' + PREV_BUTTON_ID + '" class="ktk-bf-prev is-hidden" type="button" aria-label="Back to details">' +
						'<span aria-hidden="true">&uarr;</span>' +
					'</button>' +
				'</div>' +
				'<div id="' + OPTIONS_MOUNT_ID + '"><div class="ktk-bf-option-empty">Loading options...</div></div>' +
			'</section>' +
			'<button id="' + NEXT_BUTTON_ID + '" class="ktk-bf-next" type="button" aria-label="Show options">' +
				'<span aria-hidden="true">&darr;</span>' +
			'</button>';

		moveRealEcwidOptions();
		personalizeOptions();
		updateBalanceDisplay();
		bindOptionsObserver();
		bindGestureTransition();
		bindStageButton();
		console.log("KTK Bubble Football rendered.");
	}

	function renderWithRetries() {
		var attempts = 0;
		var maxAttempts = 18;
		if (retryTimer) clearInterval(retryTimer);
		retryTimer = setInterval(function() {
			attempts += 1;
			renderCanvas();
			moveRealEcwidOptions();
			personalizeOptions();
			if (attempts >= maxAttempts) {
				clearInterval(retryTimer);
				retryTimer = null;
			}
		}, 400);
	}

	function bootstrap() {
		renderCanvas();
		renderWithRetries();
	}

	function scheduleBootstrap() {
		if (scheduled) return;
		scheduled = true;
		setTimeout(function() {
			scheduled = false;
			bootstrap();
		}, 80);
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", scheduleBootstrap);
	} else {
		scheduleBootstrap();
	}

	if (window.Ecwid && Ecwid.OnAPILoaded && Ecwid.OnAPILoaded.add) {
		Ecwid.OnAPILoaded.add(function() {
			console.log("Ecwid JS API is loaded.");
			scheduleBootstrap();
		});
	}

	if (window.Ecwid && Ecwid.OnPageLoaded && Ecwid.OnPageLoaded.add) {
		Ecwid.OnPageLoaded.add(function() {
			scheduleBootstrap();
		});
	}

	window.addEventListener("hashchange", scheduleBootstrap);
	window.addEventListener("popstate", scheduleBootstrap);
})();



