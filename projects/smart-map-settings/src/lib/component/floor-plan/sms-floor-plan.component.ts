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

import { OnInit, Component, Input, Inject, ViewChild, isDevMode, Output, EventEmitter } from '@angular/core';
import {MatSort} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';
import { Commonc8yService } from '../../common/c8y/commonc8y.service';
import { HttpClient } from '@angular/common/http';
import { FetchClient, IFetchOptions } from '@c8y/client';
import { GPSmsMapDialogComponent } from '../map-dialog/sms-map-dialog.component';
import { AlertService, Alert } from '@c8y/ngx-components';

import { FormBuilder, Validators } from '@angular/forms';
import { SmartRuleConfig } from '../../common/interfaces/widgetConfig.interface';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
@Component({
    // tslint:disable-next-line: component-selector
    selector: 'lib-sms-floor-plan',
    templateUrl: 'sms-floor-plan.component.html',
    styleUrls: ['./sms-floor-plan.component.css']
})
export class GPFloorDialogComponent implements OnInit {

    @Input() input: any;
    @Output() saved: EventEmitter<any> = new EventEmitter<any>();
    coordinates: any;
    addedFloors: any[];
    deletedFloors: Set<string>;
    floorConfig: any;
    file: any;
    level: number;
    tableColumns: string[] = ['level', 'status', 'preview', 'edit', 'delete', 'revert'];
    dataSource: any;
    floorAddConfigForm;
    floorEditConfigForm;
    smartRulesForDelete: SmartRuleConfig[] = [];
    error: boolean;
    errorMessage = '';
    isBusy = false;

   @ViewChild(MatSort, {static: true}) sort: MatSort;

    constructor(
        private formBuilder: FormBuilder,
        private commonc8yService: Commonc8yService,
        private modalService: BsModalService,
        private alert: AlertService,
        private fetchClient: FetchClient,
        private http: HttpClient,
         ) {
            this.saved = new EventEmitter<any>();
            this.addedFloors = [];
            this.deletedFloors = new Set();
        }

    ngOnInit(): void {
        this.initialise();
        this.dataSource = new MatTableDataSource(this.input.levels);
        this.dataSource.sort = this.sort;
        if (isDevMode()) {console.log(this.input); }
        this.coordinates = this.input.coordinates;
        this.error = false;
    }

    // Validate floor level
    validate(level): boolean {
        const eI = this.dataSource.data;
        const ind = eI.findIndex((f) => {
            return level === f.level;
        });
        return ind === -1;
    }

    // Validate input file
    validateInput(file?: any, level?: any): boolean {
        if (level) {
            return (file.length > 0 && level !== '');
        } else {
            return (file.length > 0);
        }
    }

    /**
     * Add floor plan for given level
     */
    addFloorPlan(level, file): void {
        if (this.validate(level)) { // File validation removed
            // const f = file[0];
            const f = null;
            this.addedFloors.push({
                buildingId: this.input.id,
                level: level,
                imageDetails: {},
                markers: [],
                file: f
            });
            this.dataSource.data.push({
                level: level,
                file: f,
                imageDetails: {},
                markers: [],
                status: 'New'
            });
            this.dataSource.sort = this.sort;
        } else {
            if (isDevMode()) {
                if (isDevMode()) {console.log('Level existing already'); }
            }
            this.alert.add({
                text: 'Level existing already',
                type: 'warning'
              } as Alert);
        }
    }

    // Initialize forom control
    initialise() {
        this.error = false;
        this.floorAddConfigForm = this.formBuilder.group({
            level: ['', Validators.required],
          //  file: ['', Validators.required]
          });
        this.floorEditConfigForm = this.formBuilder.group({
            file: ['', Validators.required],
          });
    }

    changed(event, form) {
    }

    /**
     * Validate Input file.
     */
    validateFile(files, form): void {
        this.error = false;
        const file = files.files[0];
        if (file.type.search('image') > -1) {
            form.controls['file'].setValue(file ? file.name : '');
        } else if (file.type.search('json') > -1) {
            this.validateJsonFile(files, form);
        } else {
            this.error = true;
            files.value = '';
            form.controls['file'].setValue('');
            if (isDevMode()) {
                console.log('File type should be image or json');
            }
            this.errorMessage = 'File type should be image or json';
            this.alert.add({
                text: this.errorMessage,
                type: 'warning'
              } as Alert);
        }
    }

    /**
     * Validate GeoJSON file.
     */
    private validateJsonFile(files: any, form: any) {
        const file = files.files[0];
        const reader = new FileReader();
        let input = null;
        reader.addEventListener('load', (event: any) => {
            input = event.target.result;
            if (this.commonc8yService.isValidJson(input)) {
                form.controls['file'].setValue(file ? file.name : '');
            } else {
                this.error = true;
                files.value = '';
                form.controls['file'].setValue('');
                if (isDevMode()) {
                    console.log('Invalid Json file');
                }
                this.errorMessage = 'Invalid Json file';
                this.alert.add({
                    text: this.errorMessage,
                    type: 'warning'
                } as Alert);
            }
        });
        reader.readAsText(file);
    }
    /**
     * Open Dialogbox for Preview floor plan, geofenec, device positions.
     * After closing dialog, saving information and change statuses
     */
    previewFloor(data): void {
        // this.sampleSmartRule();
        const dataObject = {
            title: 'Geography View',
            preview: true,
            data: data
        };
        const dialogRef = this.showMapDialog(dataObject);
        dialogRef.content.event.subscribe(result => {
            if (isDevMode()) {console.log(result); }
            const eI = this.dataSource.data;
            const ind = this.addedFloors.findIndex((f) => {
                return eI[data.index].level === f.level;
            });
            if (result && result.imageDetails) {
                this.dataSource.data[data.index].imageDetails = result.imageDetails;
                if (this.dataSource.data[data.index].status === 'New') {
                    this.addedFloors[ind].imageDetails = result.imageDetails;
                    // this.addedFloors[data.index].markers = result.markers;
                } else {
                    this.dataSource.data[data.index].status === undefined || this.dataSource.data[data.index].status === 'Image alligned' ?
                    this.dataSource.data[data.index].status = 'Image alligned' : (() => {
                    this.dataSource.data[data.index].status.concat(', Image alligned');
                    this.addedFloors[ind].imageDetails = result.imageDetails;
                    })();
                }
            }
            if (result && result.markers &&
                (result.markers.added.length > 0 || result.markers.deleted.length > 0)) {
                this.dataSource.data[data.index].markers = [];
                this.dataSource.data[data.index].markers = this.dataSource.data[data.index].markers.concat(result.markers.added);
                this.dataSource.data[data.index].markers = this.dataSource.data[data.index].markers.concat(result.markers.unchanged);
                if (this.dataSource.data[data.index].status === 'New') {
                    this.addedFloors[ind].markers = [];
                    this.addedFloors[ind].markers = this.addedFloors[ind].markers.concat(result.markers.added);
                    this.addedFloors[ind].markers = this.addedFloors[ind].markers.concat(result.markers.unchanged);
                } else {
                    if (this.dataSource.data[data.index].status === undefined ||
                        this.dataSource.data[data.index].status === 'Markers touched') {
                        this.dataSource.data[data.index].status = 'Markers touched';
                    } else {
                        this.dataSource.data[data.index].status = this.dataSource.data[data.index].status.concat(', Markers touched');
                        if(ind !== -1){
                            this.addedFloors[ind].markers = this.addedFloors[ind].markers.concat(result.markers.added);
                            this.addedFloors[ind].markers = this.addedFloors[ind].markers.concat(result.markers.unchanged);
                        }
                        
                    }
                }
            }
            if (result && result.geofences &&
                (result.geofences.added.length > 0 || result.geofences.deleted.length > 0)) {
                this.dataSource.data[data.index].geofences = [];
                this.dataSource.data[data.index].geofences = this.dataSource.data[data.index].geofences.concat(result.geofences.added);
                this.dataSource.data[data.index].geofences = this.dataSource.data[data.index].geofences.concat(result.geofences.unchanged);
                if (this.dataSource.data[data.index].status === 'New') {
                    this.addedFloors[ind].geofences = [];
                    this.addedFloors[ind].geofences = this.addedFloors[ind].geofences.concat(result.geofences.added);
                    this.addedFloors[ind].geofences = this.addedFloors[ind].geofences.concat(result.geofences.unchanged);
                } else {
                    if (this.dataSource.data[data.index].status === undefined ||
                        this.dataSource.data[data.index].status === 'Geofences touched') {
                        this.dataSource.data[data.index].status = 'Geofences touched';
                        this.addSmartRulesforDeletion(result.geofences.deleted);
                    } else {
                        this.dataSource.data[data.index].status = this.dataSource.data[data.index].status.concat(', Geofences touched');
                        this.addedFloors[ind].geofences = this.addedFloors[ind].geofences.concat(result.geofences.added);
                        this.addedFloors[ind].geofences = this.addedFloors[ind].geofences.concat(result.geofences.unchanged);
                        this.addSmartRulesforDeletion(result.geofences.deleted);
                    }
                }
            }
        });
      }

    /**
     * Add geofence smart rules into an array list for deletion
     */
    private addSmartRulesforDeletion(deletedGeoFences) {
        if (deletedGeoFences.length > 0) {
            deletedGeoFences.forEach(gf => {
                if (gf.smartRuleConfig && gf.smartRuleConfig.smartRuleId) {
                    const exitingRule = this.smartRulesForDelete.find(
                        (rule) => rule.smartRuleId === gf.smartRuleConfig.smartRuleId);
                    if (exitingRule === undefined) {
                        this.smartRulesForDelete.push(gf.smartRuleConfig);
                    }
                }
            });
        }
    }

    /**
     * Edit existing floor plan
     */
    editFloorPlan(index, file): void {
        if (this.validateInput(file)) {
            if (isDevMode()) {console.log(index +  ' ' + file); }
            const eI = this.dataSource.data[index];
            const floor = {
                level: eI.level,
                file: file[0],
                imageDetails: {},
                markers: []
            };
            if (eI.status === 'New') {
                const ind = this.addedFloors.findIndex((f) => {
                    return eI.level === f.level;
                });
                this.addedFloors[ind].file = file[0];
                eI.file = file[0];
            } else if (eI.status && eI.status.includes('File changed')) {
                const ind = this.addedFloors.findIndex((f) => {
                    return eI.level === f.level;
                });
                this.deletedFloors.add(eI.id);
                this.addedFloors[ind].file = file[0];
                eI['changedFile'] = file[0];
            } else {
                if (eI.status === 'Markers touched') {
                    eI.status = eI.status.concat(', File changed');
                } else if (eI.status === 'Geofences touched') {
                    eI.status = eI.status.concat(', File changed');
                } else {
                    eI.status = 'File changed';
                }
                eI['changedFile'] = file[0];
                this.deletedFloors.add(eI.id);
                this.addedFloors.push(floor);
            }
        } else {
            if (isDevMode()) {
                console.log('Inputs can\'t be empty!');
            }
            this.alert.add({
                text: 'Inputs can\'t be empty!',
                type: 'warning'
              } as Alert);
        }
    }

    /**
     * Delete floor plan method to delete floor plan for given index
     */
    deleteFloorPlan(index, id): void {
        const eI = this.dataSource.data;
        const ind = this.addedFloors.findIndex((f) => {
            return eI[index].level === f.level;
        });
        ind > -1 ? this.addedFloors.splice(ind, 1) : (() => {if (isDevMode()) {
            console.log('');
        }})();

        if (eI[index].status === 'New') {
            eI.splice(index, 1);
            this.dataSource.data = eI;
        } else {
            if (eI[index].status && eI[index].status.includes('Markers touched')) {
                eI[index].status = 'Markers touched, Marked for deletion';
            } else if (eI[index].status && eI[index].status.includes('Geofences touched')) {
                eI[index].status = 'Geofences touched, Geofences for deletion';
            } else {
                eI[index].status = 'Marked for deletion';
            }
            this.deletedFloors.add(id);
        }
    }

    /**
     * Revert last changes done in preview floor plan dialog
     */
    undoFloorPlan(index, id, level): void {

        if (this.dataSource.data[index].status.includes('Markers touched')) {
            this.dataSource.data[index].status = 'Markers touched';
        } else if (this.dataSource.data[index].status.includes('Geofences touched')) {
            this.dataSource.data[index].status = 'Geofences touched';
        } else {
            this.dataSource.data[index].status = undefined;
        }
        const dI = this.deletedFloors.has(id),
            eI = this.addedFloors.findIndex((floor) => {
                return floor.level === level;
            });
        if (dI) {
            this.deletedFloors.delete(id);
        }
        if (eI > -1) {
            this.addedFloors.splice(eI, 1);
        }
    }

    /**
     * Save all changes into manage objects and create/edit/delete binary for images
     */
     saveFloorPlan() {
        const _this = this;
        _this.isBusy = true;
        const arr = [];
        if (_this.addedFloors.length > 0 || _this.deletedFloors.size > 0) {

            const promArr = new Array();

            _this.addedFloors.forEach(async (floormap) => {
                delete floormap.changedFile;
                if (floormap.file) {
                    promArr.push(_this.commonc8yService.createBinary(floormap));
                } else {
                    this.updateFloorArray(arr, null, floormap.level);
                }
            });
            _this.deletedFloors.forEach(async (id) => {
                if (id) {
                    promArr.push(_this.commonc8yService.deleteBinary(id));
                }
            });
            this.dataSource.data.forEach(record => {
                if (record.status === 'Marked for deletion' && record.level === '0' && record.geofences) {
                    record.geofences.forEach(geofence => {
                        if (geofence.smartRuleConfig && geofence.smartRuleConfig.smartRuleId) {
                            promArr.push(this.deleteSmartRule(geofence.smartRuleConfig.smartRuleId));
                        }
                    });

                }
            });
            Promise.all(promArr).then((success) => {
                if (isDevMode()) {
                    console.log(success);
                }
                success.forEach(data => {
                    if (data && data.data) {
                        this.updateFloorArray(arr, data.data.id, data.data.level);
                    }
                });
                _this.updateBuildingData(arr);
            }
            ).catch((e) => {
                console.log(e);
            }
            );
        } else {
            _this.updateBuildingData(arr);
        }
    }

    /**
     * Update array for geography which is added/modified for given floor level
     */
    private updateFloorArray(arr, binaryId, level) {
        this.dataSource.data.find((d) => {
            if (d.level === level) {
                arr.push({
                    id: binaryId, level: d.level, imageDetails: d.imageDetails, markers: d.markers,
                    geofences: d.geofences
                });
            }
        });
    }

    /**
     * Update geography, delete smart rules and save data into manage objects
     */
    async updateBuildingData(arr): Promise<void> {
        this.dataSource.data.forEach(data => {
            if (data.status === undefined || data.status === ('Image alligned') ||
                (!data.status.includes('File changed') && (data.status.includes('Markers touched')
                || data.status.includes('Geofences touched')))) {
                arr.push({ id: data.id, level: data.level, imageDetails: data.imageDetails, markers: data.markers,
                    geofences: data.geofences});
            }
        });
        if (this.smartRulesForDelete.length > 0) {
            this.smartRulesForDelete.forEach( async rule => {
                await this.deleteSmartRule(rule.smartRuleId);
            });
        }
        if (arr && arr.length > 0) {
            const options: IFetchOptions = {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            };
            (await (await this.fetchClient.fetch('/service/smartrule/smartrules', options))).json()
                .then(async (smartRulesList) => {
                    await this.manageSmartRule(arr, smartRulesList);
                    this.updateManagedObject(arr);
                });
        } else {
            this.updateManagedObject(arr);
        }
    }
    private updateManagedObject(arr) {
        this.commonc8yService.updateManagedObject({ id: this.input.id, levels: arr }).then(res => {
            this.saved.emit('saved');
            this.addedFloors = [];
            this.deletedFloors = new Set();
            this.isBusy = false;
        });
    }

    /**
     * This method used to create/edit/delete smart rules for geofences
     */
    private  manageSmartRule(arr: any, smartRules: any) {
        return new Promise(
            (resolve, reject) => {
            const promArr = new Array<Promise<any>>();
            arr.forEach(record => {
                if (record.geofences && record.geofences.length > 0) {
                    record.geofences.forEach(async geofence => {
                        const smartRuleConfig = geofence.smartRuleConfig;
                        const smartRuleRecord = smartRules.rules.find((rule) => smartRuleConfig.smartRuleId === rule.id);
                        if (smartRuleConfig.smartRuleId && smartRuleRecord) {
                            if (smartRuleConfig.smartRule && smartRuleConfig.smartRule === 'Yes') {
                                promArr.push(this.updateSmartRule(geofence, smartRuleConfig.smartRuleId));
                               } else {
                                promArr.push(this.deleteSmartRule(smartRuleConfig.smartRuleId));
                               }
                        } else {
                            if (smartRuleConfig.smartRule && smartRuleConfig.smartRule === 'Yes') {
                                promArr.push(this.creatSmartRule(geofence));
                            }
                        }
                    });
                }
            });
            Promise.all(promArr).then((success) => {
                resolve(true);
            });
        });
    }

    /**
     * Delete smart rule based on given id
     */
    private async deleteSmartRule(smartRuleId) {
        const options: IFetchOptions = {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        };
        const response = (await (await this.fetchClient.fetch(`/service/smartrule/smartrules/${smartRuleId}`, options)));
    }

    /**
     * Create smart rule for given geofence details
     */
    private async creatSmartRule(geofence) {
        const smartRuleConfig = geofence.smartRuleConfig;
        const data = {
            'type': 'c8y_SmartRule',
            'name': smartRuleConfig.smartRuleName,
            'enabled': true,
            'config': {
                'geofence': geofence.coordinates,
                'triggerAlarmOn': smartRuleConfig.smartRuleTrigger,
                'alarmType': smartRuleConfig.smartRuleType,
                'alarmSeverity': smartRuleConfig.smartRuleSeverity,
                'alarmText': smartRuleConfig.smartRuleText
            },
            'ruleTemplateName': 'onGeofenceCreateAlarm',
            'enabledSources': [
                smartRuleConfig.smartRuleDevcie
            ]
        };
        const options: IFetchOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        };
        const response = (await (await this.fetchClient.fetch('/service/smartrule/smartrules', options)).json()); // Fetch API Response
        if (response && response.id) {
            smartRuleConfig.smartRuleId = response.id;
        }
        return geofence;
    }

    /**
     * Update exisitng smart rule for given geofence details
     */
    private async updateSmartRule(geofence, id) {
        const smartRuleConfig = geofence.smartRuleConfig;
        const data = {
            'id': id,
          //  'type': 'c8y_SmartRule',
            'name': smartRuleConfig.smartRuleName,
            'enabled': true,
            'config': {
                'geofence': geofence.coordinates,
                'triggerAlarmOn': smartRuleConfig.smartRuleTrigger,
                'alarmType': smartRuleConfig.smartRuleType,
                'alarmSeverity': smartRuleConfig.smartRuleSeverity,
                'alarmText': smartRuleConfig.smartRuleText
            },
            'ruleTemplateName': 'onGeofenceCreateAlarm',
            'enabledSources': [
                smartRuleConfig.smartRuleDevcie
            ]
        };
        const options: IFetchOptions = {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        };
        const response = (await (await this.fetchClient.fetch(`/service/smartrule/smartrules/${id}`, options)).json());
        if (response && response.id) {
            smartRuleConfig.smartRuleId = response.id;
        }
        return geofence;
    }

    private showMapDialog(data: any): BsModalRef {
        return this.modalService.show(GPSmsMapDialogComponent, { class: 'modal-lg', initialState: { input: data }});
    }
}
