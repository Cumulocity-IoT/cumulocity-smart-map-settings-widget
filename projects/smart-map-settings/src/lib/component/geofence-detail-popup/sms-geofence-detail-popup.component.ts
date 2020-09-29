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

import { Component, OnInit, Output, EventEmitter, Input, DoCheck } from '@angular/core';
import { WidgetConfig, GeofenceConfig, SmartRuleConfig } from '../../common/interfaces/widgetConfig.interface';
import { FormBuilder, FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, tap, switchMap, finalize, skip } from 'rxjs/operators';
import { Commonc8yService } from '../../common/c8y/commonc8y.service';

@Component({
    // tslint:disable-next-line: component-selector
    selector: 'lib-sms-geofence-detail-popup',
    templateUrl: './sms-geofence-detail-popup.component.html',
    styleUrls: ['./sms-geofence-detail-popup.component.css']
})
export class GeofenceDetailPopupComponent implements OnInit, DoCheck {

    @Input()
    set latLongsLayer(latLongs: any) {
        this._latLongsLayer =  latLongs;
      }

    @Input() uniqueId: any;
    @Input() editData: any;
    @Input() level: any;
    @Output() dataSaved: EventEmitter<any>;
    @Output() dataEdited: EventEmitter<any>;
    floorCoord: WidgetConfig;
    geofenceConfig: GeofenceConfig;
    smartRuleConfig: SmartRuleConfig;
    // formData: FormData;
    isSaved: boolean;
    _latLongsLayer: any;
    smartRuleOptions = ['No', 'Yes'];
    smartRuleTriggerOptions = [
        { value: 'entering', viewValue: 'On entering' },
        { value: 'leaving', viewValue: 'On leaving' },
        { value: 'both', viewValue: 'On entering and leaving' }
    ];
    smartRuleSeverityOptions = ['WARNING', 'MINOR', 'MAJOR', 'CRITICAL'];
    searching = false;
    searchFailed = false;
    model: any;
    isFormValid = this.isDataValid();
    deviceSearchTerm = new FormControl();
    deviceSearchResults = [];

    geofenceConfigForm;
    constructor(
        private formBuilder: FormBuilder,
        private cmonSvc: Commonc8yService,
    ) {
        this.isSaved = false;
        this.dataSaved = new EventEmitter<any>();
        this.dataEdited = new EventEmitter<any>();
    }

    ngOnInit(): void {
        this.initializeFloorCoordinates();
        this.deviceSearch();
    }

    /**
     * Intialzing geofence coodrinates for new geofence or loading coordinates for exiting geofence
     */
    initializeFloorCoordinates() {
        this.geofenceConfig = {};
        this.smartRuleConfig = {};
        if (this.editData) {
            this.geofenceConfig.id = this.editData.id;
            this.geofenceConfig.name = this.editData.name;
            this.smartRuleConfig = this.editData.smartRuleConfig;
            if (this.smartRuleConfig && this.smartRuleConfig.smartRuleDevcie) {
                this.cmonSvc.getTargetObject(this.smartRuleConfig.smartRuleDevcie)
                    .then((data) => {
                       // this.searchResult = data;
                        this.deviceSearchTerm.setValue(data);
                        this.smartRuleConfig.smartRuleDevcie = data.id;
                    });
            }
        } else {
            this.geofenceConfig.id = Math.floor(Math.random() * 1000000);
            this.smartRuleConfig.smartRuleDevcie = '';
            this.smartRuleConfig.smartRule = 'No',
            this.smartRuleConfig.smartRuleName = 'On geofence create alarm';
            this.smartRuleConfig.smartRuleSeverity = 'MAJOR';
            this.smartRuleConfig.smartRuleText = 'Geofence violation';
            this.smartRuleConfig.smartRuleTrigger = 'leaving';
            this.smartRuleConfig.smartRuleType = 'c8y_GeofenceAlarm';
        }
        this.geofenceConfig.smartRuleConfig = this.smartRuleConfig;
        this.geofenceConfig.coordinates = this._latLongsLayer.getLatLngs()[0];
    }

    /**
     * Return true if data is valid for save validation
     */
    isDataValid() {
        return (this.geofenceConfig && this.smartRuleConfig && this.geofenceConfig.name &&
            ((this.smartRuleConfig.smartRule === 'No') || (this.geofenceConfig.name && this.smartRuleConfig.smartRuleDevcie
            && this.smartRuleConfig.smartRuleName && this.smartRuleConfig.smartRuleText
            && this.smartRuleConfig.smartRuleType)));
    }
    ngDoCheck() {
        this.isFormValid = this.isDataValid();
    }

    /**
     * Emtit data save events when save button is clicked
     */
    onSave(): void {
        this.geofenceConfig.smartRuleConfig = this.smartRuleConfig;
        const emitObj = {};
        emitObj[this.uniqueId] = this.geofenceConfig;
        this.dataSaved.emit(emitObj);
        this.isSaved = true;
    }

    onEdit(): void {
        this.isSaved = false;
    }

    /**
     * Search Devices to display for geofence smart rule
     */
    deviceSearch() {
        this.deviceSearchTerm
            .valueChanges
            .pipe(
                debounceTime(500),
                distinctUntilChanged(),
                skip(1),
                tap(() => this.searching = true),
                switchMap(value => this.cmonSvc.getAllDevices(1, value)
                    .pipe(
                        tap(() => this.searching = false),
                    )
                )
            )
            .subscribe((result: any) => {
                this.deviceSearchResults = result;
            });
    }

    /**
     * Save device id when device is selected
     */
    deviceSelected(device) {
        if (device) {
            this.smartRuleConfig.smartRuleDevcie = device.id;
            return device.name;
        }
    }
}
