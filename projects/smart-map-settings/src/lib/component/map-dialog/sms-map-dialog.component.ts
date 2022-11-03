/**
 * Copyright (c) 2020 Software AG, Darmstadt, Germany and/or its licensors
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { Component, OnInit, isDevMode, AfterViewInit,
     ComponentFactoryResolver, Injector, ApplicationRef,
     NgZone, ComponentRef, Input, Inject, OnDestroy } from '@angular/core';
import { BuildingConfig, GeofenceConfig } from '../../common/interfaces/widgetConfig.interface';
import { BuildingEntryPopupComponent } from '../building-entry-popup/sms-building-entry-popup.component';
import { Subscription } from 'rxjs/internal/Subscription';
import { Commonc8yService } from '../../common/c8y/commonc8y.service';

declare global {
    interface Window {
        L: any;
        h337: any;
    }
}
import 'leaflet2/dist/leaflet.js';
const L: any = window.L;
import 'leaflet-draw';

import { MarkerDetailPopupComponent } from '../marker-detail-popup/sms-marker-detail-popup.component';
import { GeofenceDetailPopupComponent } from '../geofence-detail-popup/sms-geofence-detail-popup.component';
import { FormControl } from '@angular/forms';
import { debounceTime, tap, switchMap, finalize } from 'rxjs/operators';
import { LocationSearchService } from '../../common/locationSearch.service';
import { ImageRotateService } from '../../common/imageRotate.service';
import * as MarkerImage from '../../common/marker-icon';
import { TypeaheadMatch } from 'ngx-bootstrap/typeahead';
import { Observable, Observer } from 'rxjs';
export interface GPSettingsDialogInterface {
    edit ?: boolean;
    preview ?: boolean;
    data ?: any;
    draw ?: boolean;
    title: String;
}
@Component({
    // tslint:disable-next-line: component-selector
    selector: 'lib-sms-map-dialog',
    templateUrl: 'sms-map-dialog.component.html',
    styleUrls: ['./sms-map-dialog.component.css']
})
export class GPSmsMapDialogComponent implements OnInit, OnDestroy, AfterViewInit {

    @Input() input: GPSettingsDialogInterface;
    editedBuildingConfig: BuildingConfig;
    formData: FormData;
    componentCount: number;
    buildings: Map<String, BuildingConfig> = new Map();
    map: any;
    buildingEntryCompRef: ComponentRef <BuildingEntryPopupComponent> = null;
    markerDetailCompRef: ComponentRef <MarkerDetailPopupComponent> = null;
    geofenceDetailCompRef: ComponentRef<GeofenceDetailPopupComponent> = null;
    mylayer: any;
    imgBlobURL: any;
    imageDetails: any;
    geofenceDetails: any;
    geoJsonFileContent: any;
    svgFileContent: any;
    img: any;
    devicesMarked: Map<any, any> = new Map();
    markers: any;
    touchedMarkers: Map<any, any> = new Map();
    deviceMarkedForDelete: any[];
    devicesMarkedForAddition: Map<any, any> = new Map();
    devicesUntouched: any[];

    geofencesMarked: Map<String, GeofenceConfig> = new Map();
    geofencesMarkedForAddition: Map<String, GeofenceConfig> = new Map();
    geofencesMarkedForDelete: any[];
    geofencesUntouched: any[];

    locationSearchTerm = new FormControl();
    isLoading = false;
    geoSearchResults = [];
    suggestions$: Observable<any[]>;
    value= '';
    isLocationSearchActvie = false;
    geoJSONStyle = {
        color: '#8e9190',
        opacity: 1,
        weight: 2,
    };
    constructor(
        private zone: NgZone,
        private resolver: ComponentFactoryResolver,
        public dialogRef: MatDialogRef<GPSmsMapDialogComponent>,
        private commonc8yService: Commonc8yService,
        private injector: Injector,
        private appRef: ApplicationRef,
        private locationSearchAPI: LocationSearchService,
        private imageRotateService: ImageRotateService,
        @Inject(MAT_DIALOG_DATA) data
         ) { this.input = data; }

    ngOnInit(): void {
        this.componentCount = 0;
        this.editedBuildingConfig = {};
        this.devicesUntouched = [];
        this.deviceMarkedForDelete = [];

        this.geofencesUntouched = [];
        this.geofencesMarkedForDelete = [];

        this.isLocationSearchActvie = this.locationSearchAPI.isSearchDisplay();
        this.suggestions$ = new Observable((observer: Observer<any>) => {
            this.locationSearchAPI.searchGeoLocation(this.value).subscribe((res:any) => {
                console.log(res);
                observer.next(res);
            });
            
        });
        /* this.locationSearchTerm
        .valueChanges
            .pipe(
                debounceTime(300),
                tap(() => this.isLoading = true),
                switchMap(value => this.locationSearchAPI.searchGeoLocation(value)
                    .pipe(
                        finalize(() => this.isLoading = false),
                    )
                )
            )
            .subscribe((result: any) => {
                this.geoSearchResults = result;
            }); */
    }

    changeTypeaheadLoading(e: boolean): void {
        this.isLoading = e;
    }
    /**
     * Change map coordinates based on location search API output
     */
    displayFn(searchResult: any) {
        if (searchResult) {
            const latlng = L.latLng(searchResult[this.locationSearchAPI.getLatField()], searchResult[this.locationSearchAPI.getLngField()]);
            const myBounds1 = new L.LatLngBounds(latlng, latlng);
            this.map.flyToBounds(myBounds1, { animate: true, maxZoom: 14});
            return searchResult.display_name;
        }
    }

    onSelect(event: TypeaheadMatch): void {
        this.displayFn(event.item);
    }

    /**
     * Load binary file for preview floor
     */
    checkPreview(): void {
        const _this = this;
        if (this.input.preview) {
            if (this.input.data.row.status && (this.input.data.row.status.includes('File changed')
            || this.input.data.row.status === 'New')) {
                if (this.input.data.row.status.includes('File changed')) {
                    this.previewFileByType(this.input.data.row.changedFile);
                } else if (this.input.data.row.status === 'New' && this.input.data.row.file) {
                    this.previewFileByType(this.input.data.row.file);
                }
            } else if (this.input.data.row.id) {

                this.commonc8yService.downloadBinary(this.input.data.row.id).then((res: { blob: () => Promise<any>; }) => {

                    res.blob().then(function (blb) {
                        _this.previewFileByType(blb);
                       // _this.imgBlobURL = URL.createObjectURL(blb);
                       // _this.previewFloor();
                    });
                });
            } else {
                _this.previewFloor(null);
            }
        }
    }

    /**
     * Identify binary file by type and load preivew function accordingly.
     */
    private previewFileByType(file: any) {
        const _this = this;
        // || file.type.search('octet-stream') > -1
        if (file && (file.type.search('svg') > -1  )) {
            const reader = new FileReader();
            reader.addEventListener('load', (event: any) => {
                _this.svgFileContent = this.createElementFromHTML(event.target.result);
                _this.previewFloor('svg');
            });
            reader.readAsText(file);
        } else if (file && (file.type.search('image') > -1)) {
            _this.imgBlobURL = URL.createObjectURL(file);
            _this.previewFloor('image');
        } else if (file && file.type.search('json') > -1) {
            const reader = new FileReader();
            reader.addEventListener('load', (event: any) => {
                _this.geoJsonFileContent = JSON.parse(event.target.result);
                _this.previewFloor('json');
            });
            reader.readAsText(file);
        } else {
            const reader = new FileReader();
            reader.addEventListener('load', (event: any) => {
                if (this.commonc8yService.isValidJson(event.target.result)) {
                    _this.geoJsonFileContent = JSON.parse(event.target.result);
                    _this.previewFloor('json');
                } else if (this.isSVGImage(event.target.result)) {
                    _this.svgFileContent = this.createElementFromHTML(event.target.result);
                    _this.previewFloor('svg');
                } else {
                    _this.imgBlobURL = URL.createObjectURL(file);
                    _this.previewFloor('image');
                }
            });
            reader.readAsText(file);
        }
    }

    // check current file is SVG
    private isSVGImage(htmlString: any) {
        if (this.createElementFromHTML(htmlString)) {
            return true;
        }
        return false;
    }

    // Check current file has SVG tag
   private createElementFromHTML(htmlString: any) {
        const div = document.createElement('div');
        div.innerHTML = htmlString.trim();

        // find and return svg node
       return div.querySelector('svg');
    }

    ngOnDestroy(): void {
        const _this = this;
        if (_this.img) {
            _this.img.off('edit');
        }
    }

    /**
     * THis menthod is used to load map and initialzie drawing tool bar
     */
    ngAfterViewInit(): void {
        this.openMap();
        this.addOSMLayer();
        this.imageRotateService.initialize(L);
        // this.searchLayer();
        if (this.input.draw) {

            if (this.input.edit) {
                const editableLayers = this.drawOnMap(false, false, false, false, false, false, false);
                this.addEditingLayers(editableLayers);
            } else {
                const editableLayers = this.drawOnMap(false, {}, false, false, false, {}, true);
                // this.addEditingLayers(editableLayers);
            }
        }
        if (this.input.preview) {
            this.checkPreview();
            let editableLayers = null;
            if (this.input.data.row.level === '0') {
                editableLayers = this.drawOnMap(false, true, false, false, true, false, true);
            } else {
                editableLayers = this.drawOnMap(false, false, false, false, true, false, true);
            }
            this.addMarkerEditingLayers(editableLayers);
            this.addGeofenceEditingLayers(editableLayers);
          //  this.addEditingLayers(editableLayers);
        }
    }

    /**
     * Add Map Layer
     */
    addOSMLayer(): void {
        const _this = this;
        // Set up the OSM layer
        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                 maxNativeZoom: 19,
                maxZoom: 28
            }).addTo(_this.map);
    }

    /**
     * Load image overlay for dirrent types of files
     */
    previewFloor(fileType: any): void {
        const _this = this;
            const myBounds = null;
            const corners = null;
                        let topLeft = null;
                        let topRight = null;
                        let bottomLeft = null;
                        if (_this.input.data.row.imageDetails && _this.input.data.row.imageDetails.corners) {
                            topLeft = _this.input.data.row.imageDetails.corners[0];
                            topRight = _this.input.data.row.imageDetails.corners[1];
                            bottomLeft = _this.input.data.row.imageDetails.corners[2];
                        } else {
                            topLeft = _this.input.data.coordinates[1];
                            topRight = _this.input.data.coordinates[2];
                            bottomLeft = _this.input.data.coordinates[0];
                        }
                        const bounds = _this.input.data.coordinates;
                        const myBounds1 = new L.LatLngBounds(bounds);
                        _this.map.flyToBounds(myBounds1, {animate: true});
                        if (fileType === 'image' && _this.imgBlobURL) {
                            if (isDevMode()) { console.log(_this.imgBlobURL); }
                            _this.map.whenReady(function () {
                                _this.img = L.imageOverlay.rotated(_this.imgBlobURL, topLeft,
                                    topRight, bottomLeft, {
                                    opacity: 1,
                                    interactive: true,
                                }).addTo(_this.map);
                                const defaultIcon = L.icon({
                                    iconUrl: MarkerImage.markerIcon,
                                //    shadowUrl: 'marker-shadow.png',
                                    iconSize: [15, 20],
                                    iconAnchor: [5, 20]
                                });
                                const marker1 = L.marker(topLeft,
                                    { icon: defaultIcon, draggable: true, title: 'Smart Rotation Point' }).addTo(_this.map);
                                const marker2 = L.marker(topRight,
                                    { icon: defaultIcon, draggable: true, title: 'Smart Rotation Point' }).addTo(_this.map);
                                const marker3 = L.marker(bottomLeft,
                                    { icon: defaultIcon, draggable: true, title: 'Smart Rotation Point' }).addTo(_this.map);
                                marker1.on('drag dragend', (e) => {
                                    _this.img.reposition(marker1.getLatLng(), marker2.getLatLng(),
                                     marker3.getLatLng());
                                });
                                marker2.on('drag dragend', (e) => {
                                    _this.img.reposition(marker1.getLatLng(), marker2.getLatLng(), marker3.getLatLng());
                                });
                                marker3.on('drag dragend', (e) => {
                                    _this.img.reposition(marker1.getLatLng(), marker2.getLatLng(), marker3.getLatLng());
                                });
                            });
                        } else if (fileType === 'svg' && _this.svgFileContent) {
                            _this.map.whenReady(function () {
                              //  _this.img = L.svgOverlay(_this.svgFileContent, myBounds1).addTo(_this.map);
                                _this.img = L.svgOverlay.rotated(_this.svgFileContent, topLeft,
                                    topRight, bottomLeft, {
                                    opacity: 1,
                                    interactive: true,
                                }).addTo(_this.map);
                                const defaultIcon = L.icon({
                                    iconUrl: MarkerImage.markerIcon,
                                //    shadowUrl: 'marker-shadow.png',
                                    iconSize: [25, 30],
                                    iconAnchor: [0, 40]
                                });
                                const marker1 = L.marker(topLeft,
                                    { icon: defaultIcon, draggable: true, title: 'Smart scaling Point' });
                                const marker2 = L.marker(topRight,
                                    { icon: defaultIcon, draggable: true, title: 'Smart scaling Point' });
                                const marker3 = L.marker(bottomLeft,
                                    { icon: defaultIcon, draggable: true, title: 'Smart scaling Point' }).addTo(_this.map);
                                marker1.on('drag dragend', (e) => {
                                    _this.img.reposition(marker1.getLatLng(), marker2.getLatLng(),
                                        marker3.getLatLng());
                                });
                                marker2.on('drag dragend', (e) => {
                                    _this.img.reposition(marker1.getLatLng(), marker2.getLatLng(), marker3.getLatLng());
                                });
                                marker3.on('drag dragend', (e) => {
                                    _this.img.reposition(marker1.getLatLng(), marker2.getLatLng(), marker3.getLatLng());
                                });
                            });
                        } else if (fileType === 'json' && _this.geoJsonFileContent) {
                            _this.map.whenReady(function () {
                                L.geoJSON(_this.geoJsonFileContent, { style: _this.geoJSONStyle}).addTo(_this.map);
                            });
                        }
    }

    /**
     * Add position marker editing layer for device positioning functionality
     */
    addMarkerEditingLayers(editableLayers): void {
        const _this = this;
        if (_this.input.data.row.markers && _this.input.data.row.markers.length > 0) {
            const promArr = new Array();

            _this.input.data.row.markers.forEach(marker => {
                promArr.push(_this.commonc8yService.getTargetObject(marker));
            });
            Promise.all(promArr).then(res => {
                res.forEach(data => {
                    const editLayer = L.circleMarker(data.c8y_Position, {color: 'purple', weight: 1, type: 'circle'});
                    if(data?.c8y_IsAsset) {  editLayer.bindPopup(`<div><b>Asset</b> : <span>${data.name}</span></div>`);}
                    else  { editLayer.bindPopup(`<div><b>Device</b> : <span>${data.name}</span></div>`);}
                    editableLayers.addLayer(editLayer);
                    _this.openMarkerPopup(editableLayers, data);
                });
            });
        }
    }

    /**
     * Add geofence editing layer for device positioning functionality
     */
    addGeofenceEditingLayers(editableLayers): void {
        const _this = this;
        if (_this.input.data.row.geofences && _this.input.data.row.geofences.length > 0) {
            const promArr = new Array();

            _this.input.data.row.geofences.forEach(geofence => {
                const bounds = geofence.coordinates;
                const editLayer = L.polygon(bounds, { color: 'blue', weight: 1, type: 'polygon' });
                const popup = L.popup({ minWidth: 350, maxWidth: 500 });
                editLayer.bindPopup(popup);
                editableLayers.addLayer(editLayer);
                this.createPlanningPopupForGeofence(editableLayers, popup, editLayer, geofence);

            });
        }
    }

    /**
     * Add geography editing layer for device positioning functionality
     */
    addEditingLayers(editableLayers): void {
        const _this = this;
        const bounds = this.input.data.coordinates;

        const myBounds = new L.LatLngBounds(bounds);
        _this.map.flyToBounds(myBounds, {animate: true});

        const editLayer = L.polygon(bounds, { color: 'blue', weight: 1, type: 'polygon'});
        const popup = L.popup({minWidth: 350, maxWidth: 500});
        editLayer.bindPopup(popup);
        editableLayers.addLayer(editLayer);
        _this.zone.run(() => _this.createPlanningPopup(editableLayers, popup, editLayer));
    }

    /**
     * Open Popup for device position
     */
    openMarkerPopup(layer, deviceData) {
        const _this = this;
        Object.keys(layer._layers).forEach(key => {
            if (!_this.devicesMarked.has(key) && layer._layers[key].options.type === 'circle') {
                if (deviceData) {
                    _this.devicesMarked.set(key, {id: deviceData.id, c8y_Position: deviceData.c8y_Position});
                    const index = _this.devicesUntouched.indexOf(deviceData.id);
                        // tslint:disable-next-line: no-unused-expression
                        index === -1 ? _this.devicesUntouched.push(deviceData.id) : '';
                 }
            }
        });
    }

    // Load map
    openMap(): void {

        const _this = this;
                // center of the map
            const center = [-33.8650, 151.2094];
            // Create the map
            _this.map = L.map('map', {
                zoomControl: true,
                zoomAnimation: false,
                trackResize: true,
                boxZoom: true,
                scrollWheelZoom: true
            }).setView([0, 0], 2);
            // .setView([40.7259, -73.9805], 12);
          //   L.Icon.Default.imagePath = 'marker-icon.png';

    }

    /**
     * Load and configure drawing tool bar and its corresponding method
     */
    drawOnMap(polyline, polygon, marker, circle, circlemarker, rectangle, remove): any {
        const _this = this;

        // Initialise the FeatureGroup to store editable layers
        const editableLayers = new L.FeatureGroup();

        const drawPluginOptions = {
            position: 'topright',
                draw: {
                    polyline: polyline,
                    polygon: polygon,
                    marker: marker,
                    circle: circle,
                    circlemarker: circlemarker, // Turns off this drawing tool
                    rectangle: rectangle
                },
                edit: {
                    featureGroup: editableLayers, // REQUIRED!!
                    remove: remove
                }
        };

        // Initialise the draw control and pass it the FeatureGroup of editable layers
        _this.map.addControl(new L.Control.Draw(drawPluginOptions));
        _this.map.addLayer(editableLayers);

        function onDraw(e) {
            const type = e.layerType,
                layer = e.layer;
            const popup = L.popup({ minWidth: 350, maxWidth: 500});
                layer.bindPopup(popup).openPopup();
                const nu = editableLayers.addLayer(layer);

            if (type === 'rectangle' || type === 'polygon') {
                if (_this.input.draw) {
                    _this.zone.run(() => _this.createPlanningPopup(editableLayers, popup, layer));
                } else {
                    _this.zone.run(() => _this.createPlanningPopupForGeofence(editableLayers, popup, layer));
                }

            }
            if (type === 'circlemarker') {
                    _this.zone.run(() => _this.createPlanningPopupForMarker(editableLayers, popup, layer));
                }
        }

        function onEdit(e) {
            const layers = e.layers;
            if (_this.input.preview) {
                Object.keys(layers._layers).forEach(key => {
                    if (_this.devicesMarked.has(key)) {
                        const obj = _this.devicesMarked.get(key);
                        if (obj) {
                            obj.c8y_Position = {
                                lat: layers._layers[key]._latlng.lat, lng: layers._layers[key]._latlng.lng,
                                alt: Number(_this.input.data.row.level)
                            };
                            _this.devicesMarked.set(key, obj);
                            _this.devicesMarkedForAddition.set(obj.id, obj.c8y_Position);
                            const index = _this.devicesUntouched.indexOf(obj.id);
                            // tslint:disable-next-line: no-unused-expression
                            index > -1 ? _this.devicesUntouched.splice(index, 1) : '';
                        }
                    }
                    if (_this.geofencesMarked.has(key)) {
                        const obj = _this.geofencesMarked.get(key);
                        if (obj) {
                            obj.coordinates = layers._layers[key]._latlngs[0];
                            _this.geofencesMarked.set(key, obj);
                            _this.geofencesMarkedForAddition.set(key, obj);
                            const geofenceUT = _this.geofencesUntouched.find((geofenceRec) =>
                                geofenceRec.id === obj.id);
                            if (geofenceUT) {
                                _this.geofencesUntouched = _this.geofencesUntouched.filter((geoRec) =>
                                    geoRec.id !== obj.id);
                            }
                        }
                    }
                });
            } else {
                Object.keys(layers._layers).forEach(key => {
                    if (_this.input.edit) {
                        _this.editedBuildingConfig.coordinates = layers._layers[key].getLatLngs()[0];
                    } else {
                    if (_this.buildings.has(key)) {
                        const building = _this.buildings.get(key);
                        building.coordinates = layers._layers[key].getLatLngs()[0];
                        }
                    }
                });
            }
        }

        function onDelete(e) {
            const layers = e.layers;
            if (_this.input.preview) {
                Object.keys(layers._layers).forEach(key => {
                    if (_this.devicesMarked.has(key)) {
                        _this.deviceMarkedForDelete.indexOf(_this.devicesMarked.get(key).id) === -1 ?
                        // tslint:disable-next-line: no-unused-expression
                        _this.deviceMarkedForDelete.push(_this.devicesMarked.get(key).id) : '';
                        const index = _this.devicesUntouched.indexOf(_this.devicesMarked.get(key).id);
                        // tslint:disable-next-line: no-unused-expression
                        index > -1 ? _this.devicesUntouched.splice(index, 1) : '';
                        _this.devicesMarked.delete(key);
                    }
                    if (_this.geofencesMarked.has(key)) {
                        /* _this.geofencesMarkedForDelete.indexOf(_this.geofencesMarked.get(key).name) === -1 ?
                            _this.geofencesMarkedForDelete.push(_this.geofencesMarked.get(key).name) : '';
                         */
                        const obj = _this.geofencesMarked.get(key);
                        const geofenceDelete = _this.geofencesMarkedForDelete.find((geofenceRec) =>
                            geofenceRec.id === obj.id);
                        if (geofenceDelete === undefined) {
                            _this.geofencesMarkedForDelete.push(obj);
                        }
                        const geofenceUT = _this.geofencesUntouched.find((geofenceRec) =>
                            geofenceRec.id === obj.id);
                        if (geofenceUT) {
                            _this.geofencesUntouched = _this.geofencesUntouched.filter((geoRec) =>
                                geoRec.id !== obj.id);
                        }
                        _this.geofencesMarked.delete(key);
                    }
                });
            } else {
                Object.keys(layers._layers).forEach(key => {
                    if (_this.buildings.has(key)) {
                        _this.buildings.delete(key);
                    }
                });
            }
        }
        _this.map.on('draw:deleted', onDelete);
        _this.map.on('draw:edited', onEdit);
        _this.map.on('draw:created', onDraw);

        return editableLayers;
    }

    /**
     * Attached Device position popup component with this dialog
     */
    createPlanningPopupForMarker(layer: any, popup: any, activeLayer: any) {
        const _this = this;
          const subscription = new Subscription();
          const compFactory = _this.resolver.resolveComponentFactory(MarkerDetailPopupComponent);
          _this.markerDetailCompRef = compFactory.create(_this.injector);
          if (_this.appRef['attachView']) { // since 2.3.0
            _this.appRef['attachView'](_this.markerDetailCompRef.hostView);
            _this.markerDetailCompRef.onDestroy(() => {
                _this.appRef['detachView'](_this.markerDetailCompRef.hostView);
              subscription.unsubscribe();
            });
          } else {
            _this.appRef['registerChangeDetector'](_this.markerDetailCompRef.changeDetectorRef);
            _this.markerDetailCompRef.onDestroy(() => {
                _this.appRef['unregisterChangeDetector'](_this.markerDetailCompRef.changeDetectorRef);
            });
          }

          const div = document.createElement('div');
          div.appendChild(_this.markerDetailCompRef.location.nativeElement);
          popup.setContent(div);
          activeLayer.openPopup();

         Object.keys(layer._layers).forEach(key => {
            if (!_this.devicesMarked.has(key)) {
                /* if (deviceData) {
                    _this.markerDetailCompRef.instance.editData = deviceData;
                    _this.devicesMarked.set(key, {id: deviceData.id, c8y_Position: deviceData.c8y_Position});
                    const index = _this.devicesUntouched.indexOf(deviceData.id);
                        index > -1 ? _this.devicesUntouched.push(deviceData.id) : '';
                 } */
                _this.markerDetailCompRef.instance.uniqueId = key;
                _this.markerDetailCompRef.instance.latLongsLayer = layer._layers[key];
            }
        });
          subscription.add(_this.markerDetailCompRef.instance.dataSaved.subscribe((device) => {
              const latlng = {lat: device.c8y_Position.lat,
                lng: device.c8y_Position.lng, alt: Number(this.input.data.row.level)};
            _this.devicesMarked.set(device.uniqueId, {id: device.id, c8y_Position: latlng});
            _this.devicesMarkedForAddition.set(device.id, latlng);
          }
          ));
      }

      /**
     * Attached geofence popup component with this dialog
     */
    createPlanningPopupForGeofence(layer: any, popup: any, activeLayer: any, data?: any) {
        const _this = this;
        const subscription = new Subscription();
        const compFactory = _this.resolver.resolveComponentFactory(GeofenceDetailPopupComponent);
        _this.geofenceDetailCompRef = compFactory.create(_this.injector);
        if (_this.appRef['attachView']) { // since 2.3.0
            _this.appRef['attachView'](_this.geofenceDetailCompRef.hostView);
            _this.geofenceDetailCompRef.onDestroy(() => {
                _this.appRef['detachView'](_this.geofenceDetailCompRef.hostView);
                subscription.unsubscribe();
            });
        } else {
            _this.appRef['registerChangeDetector'](_this.geofenceDetailCompRef.changeDetectorRef);
            _this.geofenceDetailCompRef.onDestroy(() => {
                _this.appRef['unregisterChangeDetector'](_this.geofenceDetailCompRef.changeDetectorRef);
            });
        }

        const div = document.createElement('div');
        div.appendChild(_this.geofenceDetailCompRef.location.nativeElement);
        popup.setContent(div);
        if (!data) { activeLayer.openPopup(); }

        Object.keys(layer._layers).forEach(key => {
            if (!_this.geofencesMarked.has(key) &&
                (layer._layers[key].options.type === undefined || layer._layers[key].options.type === 'polygon')) {
                if (data) {
                    _this.geofencesMarked.set(key, {
                        id: data.id, name: data.name, coordinates: data.coordinates, smartRuleConfig: data.smartRuleConfig });
                    const geofenceUT = _this.geofencesUntouched.find((geofenceRec) => geofenceRec.id === data.id);
                    if (geofenceUT === undefined ) {
                        _this.geofencesUntouched.push(data);
                    }
                    _this.geofenceDetailCompRef.instance.editData = data;
                }
                _this.geofenceDetailCompRef.instance.uniqueId = key;
                _this.geofenceDetailCompRef.instance.level = this.input.data.row.level;
                _this.geofenceDetailCompRef.instance.latLongsLayer = layer._layers[key];
            }
        });
        subscription.add(_this.geofenceDetailCompRef.instance.dataSaved.subscribe((event) => {
            Object.keys(event).forEach((key) => {
                if (_this.geofencesMarked.has(key)) {
                    const obj = _this.geofencesMarked.get(key);
                    if (obj) {
                        _this.geofencesMarked.set(key, event[key]);
                        _this.geofencesMarkedForAddition.set(key, event[key]);
                        const geofenceUT = _this.geofencesUntouched.find((geofenceRec) =>
                            geofenceRec.id === obj.id);
                        if (geofenceUT) {
                            _this.geofencesUntouched = _this.geofencesUntouched.filter((geoRec) =>
                                geoRec.id !== obj.id);
                        }
                    }
                } else {
                    _this.geofencesMarked.set(key, event[key]);
                    _this.geofencesMarkedForAddition.set(key, event[key]);
                }
            });
            if (isDevMode()) { console.log(_this.geofencesMarkedForAddition); }
        }
        ));
    }

    /**
     * Attached geographu popup component with this dialog
     */
    createPlanningPopup(layer: any, popup: any, activeLayer: any) {
        const _this = this;
          const subscription = new Subscription();

          const compFactory = _this.resolver.resolveComponentFactory(BuildingEntryPopupComponent);
          _this.buildingEntryCompRef = compFactory.create(_this.injector);
          if (_this.appRef['attachView']) { // since 2.3.0
            _this.appRef['attachView'](_this.buildingEntryCompRef.hostView);
            _this.buildingEntryCompRef.onDestroy(() => {
                _this.appRef['detachView'](_this.buildingEntryCompRef.hostView);
              subscription.unsubscribe();
            });
          } else {
            _this.appRef['registerChangeDetector'](_this.buildingEntryCompRef.changeDetectorRef);
            _this.buildingEntryCompRef.onDestroy(() => {
                _this.appRef['unregisterChangeDetector'](_this.buildingEntryCompRef.changeDetectorRef);
            });
          }

          const div = document.createElement('div');
          div.appendChild(_this.buildingEntryCompRef.location.nativeElement);
          popup.setContent(div);

          if (this.input.edit) {
            _this.buildingEntryCompRef.instance.editData = this.input.data;
          } else {
              activeLayer.openPopup();
          }

            Object.keys(layer._layers).forEach(key => {
                if (!_this.buildings.has(key)) {
                    _this.buildingEntryCompRef.instance.uniqueId = key;
                    _this.buildingEntryCompRef.instance.latLongsLayer = layer._layers[key];
                }
            });
          subscription.add(_this.buildingEntryCompRef.instance.dataSaved.subscribe((event) => {

                Object.keys(event).forEach((key) => {
                    _this.buildings.set(key, event[key]);
                });
                if (isDevMode()) {console.log(_this.buildings); }
            }
          ));
      }

      /**
       * Save geography changes such as device positioning, geofences, image alignment and send back to parent component
       * for further action if this dialog box open in preview mode else save changes in cumulocity db
       */
      saveFloorPlan(): void {

       if (this.input.preview) {
        const promArr = new Array<Promise<any>>();
            if (this.devicesMarkedForAddition.size > 0) {
                this.devicesMarkedForAddition.forEach(async (value, key, map) => {
                    const marker = this.devicesMarkedForAddition.get(key);
                    promArr.push((this.commonc8yService.updateManagedObject({id: key, c8y_Position: marker})));
                });
            }
            Promise.all(promArr).then((success) => {
                if (isDevMode()) {
                    console.log(success);
                }
                const  markers = [];
                if (success.length > 0) {
                    success.forEach(data => {
                        if (data.data) {
                            markers.push(data.data.id);
                        }
                    });
                }
                const geofences = [];
                if (this.geofencesMarkedForAddition.size > 0) {
                    this.geofencesMarkedForAddition.forEach(async (value, key, map) => {
                        geofences.push(this.geofencesMarkedForAddition.get(key));

                    });
                }
                if (this.imgBlobURL || this.svgFileContent) {
                    this.imageDetails = {
                        corners: this.img.getImageBound()
                    };
                }
                this.dialogRef.close({imageDetails: this.imageDetails,
                    markers: { added: markers, unchanged: this.devicesUntouched, deleted: this.deviceMarkedForDelete},
                    geofences: { added: geofences, unchanged: this.geofencesUntouched, deleted: this.geofencesMarkedForDelete }});
            });
       } else {

            const promArr = new Array<Promise<any>>();


                if (this.input.edit) {
                    const modBuilding = {
                        id: this.input.data.id
                    };
                    if (this.buildings.size > 0) {
                        this.buildings.forEach(async (value, key, map) => {
                            modBuilding['name'] = this.buildings.get(key).name;
                            modBuilding['location'] = this.buildings.get(key).location;
                            modBuilding['assetType'] = this.buildings.get(key).assetType;
                        });
                    }
                    if (this.editedBuildingConfig.coordinates) {
                        modBuilding['coordinates'] = this.editedBuildingConfig.coordinates;
                    }

                promArr.push((this.commonc8yService.updateManagedObject(modBuilding)));
            } else {
                this.buildings.forEach(async (value, key, map) => {
                    const building = this.buildings.get(key);
                    promArr.push((this.commonc8yService.createManagedObject(building)));
                });
            }

            Promise.all(promArr).then(() => {
                this.dialogRef.close(promArr);
                this.map.off('draw:created');
            }).catch((e) => console.log(e));
        }
      }
}
