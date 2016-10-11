
// --- Implementation for building annnotations in Microdata Syntax

var SCHEMA_ORG = "http://schema.org/"

var Microdata = {
    /**
     * This is called via the "addInitHook" leaflet provides us, for each Leaflet item we translate.
     * This either annotates an element directly when it is added to the map or listens to the
     * event signifying us that Leaflet has completed the buildup of its DOM representation for the geodata.
     */
    annotate: function() {
        var target = this._getTargetDOMElement()
        // 1) Check if Leaflet already created the corresponding DOM Element
        if (target) {
            // 1.1) Build annotations for all items we already know the DOM element
            this._buildAnnotations(target)
        } else {
            // 1.2) Register listeners for when this is done
            this.on('add', function() { // Marker
                target = this._getTargetDOMElement()
                this._buildAnnotations(target)
            })
            this.on('open', function() { // Opening Popup
                target = this._getTargetDOMElement()
                this._buildAnnotations(target)
            })
            this.on('load', function(e) { // When Image Overlay Element is Available
                target = this._getTargetDOMElement()
                this._buildAnnotations(target)
            })
            this.on('close', function() { // Closing Popup
                var previousContainer = []
                this._findPopupContainerElement(this, previousContainer)
                this._container = previousContainer[0]
            })
        }
        return this
    },
    _findPopupContainerElement: function(element, result) {
        var childNodes = element._container.childNodes
        for (var el in childNodes) {
            var element = childNodes[el]
            if (element.className.indexOf('leaflet-popup') != -1) return element
        }
    },
    _findContainerElements: function(element, results) {
        if (element._container) {
            results.push(element._container)
        }
        if (element._layers) {
            for (var el in element._layers) {
                var layer = element._layers[el]
                this._findContainerElements(layer, results)
            }
        }
    },
    _findSVGGroupElements: function(element, results) {
        if (element._container) {
            if (element._container.localName === "g") results.push(element)
        }
        if (element._layers) {
            for (var el in element._layers) {
                var layer = element._layers[el]
                this._findSVGGroupElements(layer, results)
            }
        }
    },
    _buildPolygonArray: function(wgsCoordinates) {
        var array = []
        for (var l in wgsCoordinates) {
            array.push(wgsCoordinates[l]['lat'])
            array.push(wgsCoordinates[l]['lng'])
        }
        return array
    },
    _createMetaElement: function(key, value) {
        var el = document.createElement('meta')
            el.setAttribute(key, value)
        return el
    },
    _createGroupingElement: function(elementName, key, value) {
        var el = document.createElement(elementName)
            el.setAttribute(key, value)
        return el
    },
    _buildAnnotations: function(targets) {
        if (Object.prototype.toString.call(targets) !== '[object Array]') {
            targets = [targets]
        }
        var metadata = undefined
        var domObject = targets[0]
        var parentElement = domObject.parentNode
        var geoPropertyName = (this.options.hasOwnProperty('geoprop')) ? this.options.geoprop : "geo"
        var domId = (this.options.hasOwnProperty('domId')) ? this.options.domId : undefined
        var targetIsSVGGroup = (domObject.tagName === 'g') ? true : false
        var hasLatLngValuePair = this.hasOwnProperty('_latlng')
        var hasBoundingBox = this.hasOwnProperty('_bounds')
        var hasLayers = this.hasOwnProperty('_layers')
        var leafletId = this['_leaflet_id']
        // Useful for debugging when adding support for new items, such as L.ImageOverlay here
        // console.log("Bulding Overlay Annotations Parent", parentElement, "Has Lat/Lng Pair", hasLatLngValuePair, "Has Bounding Box", hasBoundingBox, this)
        // 1) Annotating "Marker", "Popup" (Point Style) and "Image Overlay" into a new ARTICLE element
        if (!targetIsSVGGroup && this.options.hasOwnProperty('itemtype')) {
            metadata = this._buildAnnotationsContainer('article', domId, leafletId)
            this._buildGenericProperties(metadata, this)
            var placeAnnotation = undefined
            if (hasLatLngValuePair && !hasBoundingBox) {
                placeAnnotation = this._buildGeoAnnotation('div', this, 'point', geoPropertyName)
            } else if (hasBoundingBox) {
                placeAnnotation = this._buildGeoAnnotation('div', this, 'box', geoPropertyName)
            } else {
                console.log("Invalid argument provided: Neither a BoundingBox nor a Coordinate Pair could be detected to build a geographic annotation.")
                console.warn("Skipping semantic annotation of the following Leaflet item due to a previous error", this)
                return
            }
            // Place the newly created Element into either ...
            // a) its existing container
            metadata.appendChild(placeAnnotation)
            metadata.appendChild(domObject)
            // Note: If Parent DOM Element is NOT the "Overlay" or "Marker" Pane clear it up. ### Double check this for all Leaflet items we annotate
            if (parentElement.className.indexOf("overlay-pane") == -1 && parentElement.className.indexOf("marker-pane") == -1) {
                parentElement.innerHTML = ''
            }
            // b) .. or just append it to the overlay-pane DOM
            parentElement.appendChild(metadata)
            this.options._annotated = true
        // 2.) Annotations into SVG Metadata Element, currently just for geoJSON or circleMarker overlays
        } else if (targetIsSVGGroup && this.options.hasOwnProperty('itemtype')) {
            if (hasLayers) {
                // 2.1) Build annotations an SVG Element which is going to represent MANY LAYERS
                var groupElements = []
                this._findSVGGroupElements(this, groupElements)
                for (var lg in groupElements) {
                    var element = groupElements[lg]
                    var containerElement = element._container
                    //console.log("   SVG Leaflet Geometry Group, LeafletID", element['_leaflet_id'], element)
                    metadata = this._buildAnnotationsContainer('metadata', domId, element['_leaflet_id'])
                    this._buildGenericProperties(metadata, this)
                    var place = this._buildGeoAnnotation('g', element, 'shape', geoPropertyName)
                    metadata.appendChild(place)
                    containerElement.appendChild(metadata)
                }
                metadata = undefined // notes that metadata elements have been already appended to the DOM
            } else {
                // 2.2) Build annotations for an SVG Based Element (ONE WITHOUT MULTIPLE LAYERS)
                // console.log("Single SVG Element Annotations", this.options.itemtype, "SVG Element" + ", LeafletID", leafletId, this)
                metadata = this._buildAnnotationsContainer('metadata', domId, leafletId)
                this._buildGenericProperties(metadata, this)
                var place = this._buildGeoAnnotation('g', this, 'point', geoPropertyName)
                metadata.appendChild(place)
            }
            if (metadata) {
                domObject.appendChild(metadata)
                this.options._annotated = true
            }
        }
    },
    _buildAnnotationsContainer: function(elementName, domId, leafletId) {
        var article = document.createElement(elementName)
        if (domId) article.setAttribute('id', domId)
        article.setAttribute('itemscope','')
        article.setAttribute('itemtype', 'http://schema.org/' + this.options.itemtype)
        article.setAttribute('data-internal-leaflet-id', leafletId)
        return article
    },
    _buildGenericProperties: function(parentElement, object) {
        // Maps Leaflet.annotate options to Schema.org and Dublin Core Element Names
        if (object.options.hasOwnProperty('title')) {
            this._appendMetaItempropContent(parentElement, 'name', object.options.title)
        }
        if (object.options.hasOwnProperty('description')) {
            this._appendMetaItempropContent(parentElement, 'description', object.options.description)
        }
        if (object.options.hasOwnProperty('url')) {
            this._appendMetaItempropContent(parentElement, 'url', object.options.url)
        }
        if (object.options.hasOwnProperty('sameAs')) {
            this._appendMetaItempropContent(parentElement, 'sameAs', object.options.sameAs)
        }
        if (object.options.hasOwnProperty('alternateName')) {
            this._appendMetaItempropContent(parentElement, 'alternateName', object.options.alternateName)
        }
        if (object.options.hasOwnProperty('image')) {
            this._appendMetaItempropContent(parentElement, 'image', object.options.image)
        }
        // Dublin Core Legacy Namespace: http://purl.org/dc/elements/1.1 "dc:xyz"
        // Without: Title, Description, Subject, Type and Coverage) and a Duplicate with Thing: sameAs == identifier
        if (object.options.hasOwnProperty('creator')) {
            this._appendMetaNameContent(parentElement, 'http://purl.org/dc/elements/1.1/creator', object.options.creator)
        }
        if (object.options.hasOwnProperty('contributor')) {
            this._appendMetaNameContent(parentElement, 'http://purl.org/dc/elements/1.1/contributor', object.options.contributor)
        }
        if (object.options.hasOwnProperty('publisher')) {
            this._appendMetaNameContent(parentElement, 'http://purl.org/dc/elements/1.1/publisher', object.options.publisher)
        }
        if (object.options.hasOwnProperty('published')) {
            this._appendMetaNameContent(parentElement, 'http://purl.org/dc/elements/1.1/date', object.options.published)
        }
        if (object.options.hasOwnProperty('identifier')) {
            this._appendMetaNameContent(parentElement, 'http://purl.org/dc/elements/1.1/identifier', object.options.identifier)
        }
        if (object.options.hasOwnProperty('rights')) {
            this._appendMetaNameContent(parentElement, 'http://purl.org/dc/elements/1.1/rights', object.options.rights)
        }
        if (object.options.hasOwnProperty('derivedFrom')) {
            this._appendMetaNameContent(parentElement, 'http://purl.org/dc/elements/1.1/source', object.options.derivedFrom)
        }
        if (object.options.hasOwnProperty('format')) {
            this._appendMetaNameContent(parentElement, 'http://purl.org/dc/elements/1.1/format', object.options.format)
        }
        if (object.options.hasOwnProperty('language')) {
            this._appendMetaNameContent(parentElement, 'http://purl.org/dc/elements/1.1/language', object.options.language)
        }
        // Terms Namespace http://purl.org/dc/terms/    "dcterms:xyz"
        if (object.options.hasOwnProperty('created')) {
            this._appendMetaNameContent(parentElement, 'http://purl.org/dc/terms/created', object.options.created)
        }
        if (object.options.hasOwnProperty('modified')) {
            this._appendMetaNameContent(parentElement, 'http://purl.org/dc/terms/modified', object.options.modified)
        }
    },
    _appendMetaNameContent: function(parent, elementName, elementTextContent) {
        var valueElement = this._createMetaElement('name', elementName)
            valueElement.setAttribute('content', elementTextContent)
        parent.appendChild(valueElement)
    },
    _appendMetaItempropContent: function(parent, elementName, elementTextContent) {
        var valueElement = this._createMetaElement('itemprop', elementName)
            valueElement.setAttribute('content', elementTextContent)
        parent.appendChild(valueElement)
    },
    _buildGeoAnnotation: function(element, object, geoType, geoPropertyName) {
        if (typeof element != 'object') {
            element = document.createElement(element)
        }
        // console.log("Building Geo Annotation", object.options.itemtype, geoType, geoPropertyName)
        // --- Here we know the entity to annotate has the "geo"-property
        if (hasGeoProperty(object.options.itemtype)) {
            element.setAttribute('itemprop', geoPropertyName)
            this._buildGeographicIndicators(element, geoType, object)
        // --- Here we know that the type has a property defined which can handle a "Place" as its value
        // --- ### Also allow for geographic annotation with not only Place but, e.g its subtypes, like 
        // --- "AdministrativeArea" or other types "GeoShape", "GeoCoordinate" or simply "Text"
        } else if (isValidPlaceProperty(geoPropertyName)) {
            element.setAttribute('itemscope','')
            element.setAttribute('itemtype', 'http://schema.org/Place')
            element.setAttribute('itemprop', geoPropertyName)
            var geoElement = this._createGroupingElement(element.localName, 'itemprop', 'geo')
            this._buildGeographicIndicators(geoElement, geoType, object)
            element.appendChild(geoElement)

        } else {
            console.warn("Could not build up geo annotations for " + object.options.itemtype + " and an undefined \"geoproperty\" value ")
        }
        return element
    },
    _buildGeographicIndicators: function (element, type, object) {
        if (type === "shape") {
            element.setAttribute('itemtype', 'http://schema.org/GeoShape')
            element.setAttribute('itemscope', '')
            var polygon = this._createMetaElement('itemprop', 'polygon')
                polygon.setAttribute('content', this._buildPolygonArray(object._latlngs))
            element.appendChild(polygon)
        } else if (type === "point") {
            element.setAttribute('itemtype', 'http://schema.org/GeoCoordinates')
            element.setAttribute('itemscope', '')
            var latitude = this._createMetaElement('itemprop', 'latitude')
                latitude.setAttribute('content', object._latlng.lat)
            var longitude = this._createMetaElement('itemprop', 'longitude')
                longitude.setAttribute('content', object._latlng.lng)
            element.appendChild(latitude)
            element.appendChild(longitude)
        } else if (type === "box") {
            element.setAttribute('itemtype', 'http://schema.org/GeoShape')
            element.setAttribute('itemscope', '')
            var polygon = this._createMetaElement('itemprop', 'box')
                polygon.setAttribute('content', object._bounds._southWest.lat +"," + object._bounds._southWest.lng + " "
                    + object._bounds._northEast.lat + "," + object._bounds._northEast.lng)
            element.appendChild(polygon)
        } else {
            console.warn("Unsupported type of geographic value indication, currently supported are 'point', 'box' and 'polygon'")
        }
    }
}

// ---- Simple Marker ---- //
var superMarkerOnRemove = L.Marker.prototype.onRemove
L.Marker.include(Microdata)
L.Marker.addInitHook(function () { this.annotate() })
L.Marker.include({
    _getTargetDOMElement: function() {
        return this._icon
    },
    onRemove: function(map) {
        if (this.options._annotated) {
            this._icon = this._icon.parentNode
        }
        superMarkerOnRemove.call(this, map)
    }
})

// ---- Circle Marker ---- //
L.CircleMarker.include(Microdata)
L.CircleMarker.addInitHook(function () { this.annotate() })
L.CircleMarker.include({
    _getTargetDOMElement: function() {
        var results = []
        this._findContainerElements(this, results)
        return results.length > 0 ? results[0] : null
    }

})

// ---- Popup Item ---- //

L.Popup.include(Microdata)
L.Popup.addInitHook(function () { this.annotate() })
var superPopupOnRemove = L.Popup.prototype.onRemove
L.Popup.include({
    _getTargetDOMElement: function() {
        if (this.hasOwnProperty('_container')) { // Popup Container is initialized
            return this._container
        }
    },
    onRemove: function(map) {
        if (this.options._annotated) {
            this._container = this._container.parentNode
        }
        superPopupOnRemove.call(this, map)
    }
})

// ---- Layer Group (GeoJSON Layer) ---- //
L.LayerGroup.include(Microdata)
L.LayerGroup.addInitHook(function () {  this.annotate() })
L.LayerGroup.include({
    _getTargetDOMElement: function() {
        var results = []
        this._findContainerElements(this, results)
        return results.length > 0 ? results[0] : null
    }
})

// ---- Image Overlay ---- //
L.ImageOverlay.include(Microdata)
L.ImageOverlay.addInitHook(function () { this.annotate() })
L.ImageOverlay.include({
    _getTargetDOMElement: function() {
        if (this.hasOwnProperty('_image')) { // Image Overlay Container is initialized
            return this._image
        }
    }
})


/** -----
    Assistant for building dialogs managing annotation of web map elements.
    List of valid 'itemtype' values with a display label in English and their resp. 'geoprop' values. ------ **/

// Model: { Type Name (key) : Type Label (English), validProperties: [ "Valid property names for the type" ] }

    var validItemTypesEn = [

        {
            "Organization": "Organisation",
            "validProperties": { "areaServed": [], "foundingLocation": [], "hasPOS": [], "location": [] }
        },



        {
            "CreativeWork": "Künstlerische Arbeit",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "Article": "Artikel",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "Blog": "Blog",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "Book": "Buch",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "Clip": "Clip",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "Comment": "Kommentar",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "Conversation": "Konversation",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "CreativeWorkSeason": "Künstlerische Arbeit (Staffel)",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "CreativeWorkSeries": "Künstlerische Arbeit (Folge)",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "DataCatalog": "Verzeichnis",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "Dataset": "Datensatz",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "DigitalDocument": "Digitales Dokument",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "Episode": "Episode",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "Game": "Spiel",
            "validProperties":  { "contentLocation": [], "locationCreated": [], "spatialCoverage": [], "gameLocation": [] }
        },
        {
            "MediaObject": "Medieninhalt",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [], "regionsAllowed": [] }
        },
        {
            "AudioObject": "Audiodatei",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [], "regionsAllowed": [] }
        },
        {
            "ImageObject": "Bilddatei",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [], "regionsAllowed": [] }
        },
        {
            "Map": "Karte",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "Movie": "Film",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "MusicComposition": "Musikalische Komposition",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "MusicPlaylist": "Playlist",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "MusicRecording": "Musikaufnahme",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "Painting": "Gemälde",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "Photograph": "Fotographie",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "PublicationIssue": "Publication Issue",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "PublicationVolume": "Publication Volume",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "Question": "Frage",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "Recipe": "Rezept",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "Review": "Rezension",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "Sculpture": "Skulptur",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "Series": "Serie",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "SoftwareApplication": "Software Anwendung",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "TVSeason": "TV Staffel",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "TVSeries": "TV Serie",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "SoftwareSourceCode": "Software Quellcode",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "VisualArtwork": "Visuelles Kunstwerk",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "WebPage": "Webpage",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },
        {
            "WebSite": "Webseite",
            "validProperties": { "contentLocation": [], "locationCreated": [], "spatialCoverage": [] }
        },



        {
            "Person": "Person",
            "validProperties": { "birthPlace": [], "deathPlace": [], "hasPOS": [], "homeLocation": [], "workLocation": [] }
        },
        {
            "JobPosting": "Stellenangebot",
            "validProperties": { "jobLocation": [] }
        },



        {
            "Action": "Aktion",
            "validProperties": { "location": [] }
        },
        {
            "Event": "Event",
            "validProperties": { "location": [] }
        },
        {
            "ExerciseAction": "Exercise Action",
            "validProperties": { "fromLocation": [], "toLocation": [] }
        },
        {        
            "MoveAction": "Move Action",
            "validProperties": { "fromLocation": [], "toLocation": [] }
        },
        {
            "TransferAction": "Transfer Action",
            "validProperties": { "fromLocation": [], "toLocation": [] }
        },
        {
            "ServiceChannel": "Service Channel",
            "validProperties":  { "serviceLocation": [] }
        },
        {
            "RentalCarReservation": "Mietwagen Reservierung",
            "validProperties": { "dropoffLocation": [], "pickupLocation": [] }
        },
        {
            "Demand": "Nachfrage",
            "validProperties": { "areaServed": [], "availableAtOrFrom": [], "eligibleRegion": [], "ineligibleRegion": [] }
        },
        {
            "Offer": "Angebot",
            "validProperties": { "areaServed": [], "availableAtOrFrom": [], "eligibleRegion": [], "ineligibleRegion": [] }
        },
        {
            "Service": "Dienstleistung",
            "validProperties": { "areaServed": [] }
        },
        {
            "ContactPoint": "Anlaufpunkt",
            "validProperties": { "areaServed": [] }
        },

        // --- All types of Place --- //

        {
            "Place": "Ort",
            "validProperties": { "containedInPlace": [], "containsPlace": [], "geo": [] }
        },
        {
            "Accommodation": "Unterbringung",
            "validProperties": { "containedInPlace": [], "containsPlace": [], "geo": [] }
        },
        {
            "AdministrativeArea": "Administrative Einheit",
            "validProperties": { "containedInPlace": [], "containsPlace": [], "geo": [] }
        },
        {
            "City": "Stadt",
            "validProperties": { "containedInPlace": [], "containsPlace": [], "geo": [] }
        },
        {
            "Country": "Land",
            "validProperties": { "containedInPlace": [], "containsPlace": [], "geo": [] }
        },
        {
            "State": "Bundesland",
            "validProperties": { "containedInPlace": [], "containsPlace": [], "geo": [] }
        },
        {
            "CivicStructure": "Öffentliches Gebäude",
            "validProperties": { "containedInPlace": [], "containsPlace": [], "geo": [] }
        },
        {
            "Airport": "Flughafen",
            "validProperties": { "containedInPlace": [], "containsPlace": [], "geo": [] }
        },
        {
            "Aquarium": "Aquarium",
            "validProperties": { "containedInPlace": [], "containsPlace": [], "geo": [] }
        },
        {
            "Beach": "Strand",
            "validProperties": { "containedInPlace": [], "containsPlace": [], "geo": [] }
        },
        {
            "Bridge": "Brücke",
            "validProperties": { "containedInPlace": [], "containsPlace": [], "geo": [] }
        },
        {
            "BusStation": "ZOB",
            "validProperties": { "containedInPlace": [], "containsPlace": [], "geo": [] }
        },
        {
            "BusStop": "Bushaltestelle",
            "validProperties": { "containedInPlace": [], "containsPlace": [], "geo": [] }
        },
        {
            "Campground": "Campingplatz",
            "validProperties": { "containedInPlace": [], "containsPlace": [], "geo": [] }
        },
        {
            "Cemetery": "Friedhof",
            "validProperties": { "containedInPlace": [], "containsPlace": [], "geo": [] }
        },
        {
            "LandmarksOrHistoricalBuildings": "Landmarks or Historical Buildings",
            "validProperties": { "containedInPlace": [], "containsPlace": [], "geo": [] }
        },
        {
            "Landform": "Landform",
            "validProperties": { "containedInPlace": [], "containsPlace": [], "geo": [] }
        },
        {
            "LocalBusiness": "Geschäft",
            "validProperties": { "containedInPlace": [], "containsPlace": [], "geo": [] }
        },
        {
            "Residence": "Residenz",
            "validProperties": { "containedInPlace": [], "containsPlace": [], "geo": [] }
        },
        {
            "TouristAttraction": "Touristenattraktion",
            "validProperties": { "containedInPlace": [], "containsPlace": [], "geo": [] }
        }
]
