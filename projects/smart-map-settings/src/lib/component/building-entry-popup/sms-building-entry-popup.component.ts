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
import { Component, OnInit, isDevMode, Output, EventEmitter, Input, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import { WidgetConfig, BuildingConfig } from '../../common/interfaces/widgetConfig.interface';
import { FormBuilder, Validators, FormControl } from '@angular/forms';

@Component({
    // tslint:disable-next-line: component-selector
    selector: 'lib-sms-building-entry-popup',
    templateUrl: './sms-building-entry-popup.component.html',
    styleUrls: ['./sms-building-entry-popup.component.css']
})
export class BuildingEntryPopupComponent implements OnInit {

    @Input()
    set latLongsLayer(latLongs: any) {
        this._latLongsLayer =  latLongs;
      }

    @Input() uniqueId: any;
    @Input() editData: any;
    @Output() dataSaved: EventEmitter<any>;
    @Output() dataEdited: EventEmitter<any>;
    floorCoord: WidgetConfig;
    buildingConfig: BuildingConfig;
    formData: FormData;
    isSaved: boolean;
    _latLongsLayer: any;
    assetTypes = ['Production', 'Sales', 'Marketing', 'Warehouse', 'Office'];
    buildingConfigForm;
    constructor(
        private formBuilder: FormBuilder
    ) {
        this.isSaved = false;
        this.dataSaved = new EventEmitter<any>();
        this.dataEdited = new EventEmitter<any>();
    }

    ngOnInit(): void {
        this.buildingConfigForm = this.formBuilder.group({
            buildingName: ['', Validators.required],
            location: ['', Validators.required],
            assetTypes: ['', [Validators.required]]
          });
        this.initializeFloorCoordinates();
    }

    /**
     * Initiazlie floor coordinates and geography data
     */
    initializeFloorCoordinates() {
        this.buildingConfig = {};
        if (this.editData) {
            this.buildingConfigForm.setValue({
                buildingName: this.editData.name,
                location: this.editData.location,
                assetTypes: this.editData.assetType
            });
         }
        this.buildingConfig.coordinates = this._latLongsLayer.getLatLngs()[0];
        this.buildingConfig.type = 'c8y_Building';
        this.buildingConfig.levels = [];
    }

    /**
     * Save New or modified geography data
     */
    onSave(): void {
        if (isDevMode()) {console.log(this.buildingConfigForm); }
        this.buildingConfig.name = this.buildingConfigForm.value.buildingName;
        this.buildingConfig.location = this.buildingConfigForm.value.location;
        this.buildingConfig.assetType = this.buildingConfigForm.value.assetTypes;
        const emitObj = {};
        emitObj[this.uniqueId] = this.buildingConfig;
        this.dataSaved.emit(emitObj);
        this.isSaved = true;
    }

    /**
     * On Edit change flag to false
     */
    onEdit(): void {
        this.isSaved = false;
    }

}
