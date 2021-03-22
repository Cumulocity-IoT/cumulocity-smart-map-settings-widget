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

import { Component, OnInit, isDevMode, ViewChild, Input } from '@angular/core';
import { WidgetConfig, ConfigCoordinates, BuildingConfig } from '../../common/interfaces/widgetConfig.interface';
import { Commonc8yService } from '../../common/c8y/commonc8y.service';
import {MatTableDataSource} from '@angular/material/table';
import {MatSort} from '@angular/material/sort';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import { GPSmsMapDialogComponent } from '../map-dialog/sms-map-dialog.component';
import { FetchClient, IFetchOptions } from '@c8y/client';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AlertService, Alert } from '@c8y/ngx-components';
import { LocationSearchService } from '../../common/locationSearch.service';
import { GPDeleteConfirmComponent } from '../delete-confirm-popup/sms-delete-confirm.component';

@Component({
    // tslint:disable-next-line: component-selector
    selector: 'lib-sms-building-detail',
    templateUrl: './sms-building-detail.component.html',
    styleUrls: ['./sms-building-detail.component.css'],
    animations: [
        trigger('detailExpand', [
          state('collapsed', style({height: '0px', minHeight: '0', display: 'none'})),
          state('expanded', style({height: '*'})),
          transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
        ]),
      ],
})
export class GPFloorPlanSettingsComponent implements OnInit {

    floorCooridnates = [];
    dataSource = new MatTableDataSource<WidgetConfig>([]);
    isBusy  = false;
    dialogConfig = new MatDialogConfig();
     @ViewChild(MatSort, {static: true})
    set sort(v: MatSort) { this.dataSource.sort = v; }
    displayedColumns: string[] = ['id', 'name', 'assetType', 'location', 'floorsAvailable', 'delete', 'edit'];
    expandedElement: any;
    private _config: any = {};

    @Input() set config(newConfig: any) {
        this._config = newConfig;
        if (this._config && this._config.geoSearchAPI && this._config.latField && this._config.lngField) {
            this.locationSearchService.setSearchSettings(this._config.geoSearchAPI, this._config.latField, this._config.lngField );
        }
    }
    constructor(
        private cmonSvc: Commonc8yService,
        private dialog: MatDialog,
        private alert: AlertService,
        private commonc8yService: Commonc8yService,
        private locationSearchService: LocationSearchService,
        private fetchClient: FetchClient) {}

    ngOnInit() {
        // tslint:disable-next-line: max-line-length
        if (this._config && this._config.geoSearchAPI && this._config.latField && this._config.lngField) {
            this.locationSearchService.setSearchSettings(this._config.geoSearchAPI, this._config.latField, this._config.lngField);
        }
        this.dialogConfig.disableClose = true;
        this.dialogConfig.autoFocus = true;
        this.dialogConfig.width = '70%';
        this.loadFloorData();
    }

    addFloorCoordinates() {
        const floorCoord: WidgetConfig = {};
        this.floorCooridnates.push(floorCoord);
    }

    private loadFloorCoordinates(x: any) {
        const buildingCoord: BuildingConfig = {};
        buildingCoord.name = x.name;
        buildingCoord.type = x.type;
        buildingCoord.id = x.id;
        buildingCoord.location = x.location;
        buildingCoord.coordinates = x.coordinates;
        buildingCoord.levels = x.levels;
        buildingCoord.assetType = x.assetType;
        this.floorCooridnates.push(buildingCoord);
    }

    /**
     * Load geography data from inventory service
     */
    loadFloorData() {
        let theInvList = null;
        this.isBusy = true;
        this.floorCooridnates = [];
        this.cmonSvc.getInventoryItems(1, theInvList, 'c8y_Building')
            .then((deviceFound) => {
                theInvList = deviceFound.data;
                if (isDevMode()) {console.log(theInvList); }

                if (isDevMode()) { console.log('+-+- INVENTORY FOUND ', theInvList); }
                theInvList.forEach((bfp) => {
                    this.loadFloorCoordinates(bfp);
                });
                this.dataSource.data = this.floorCooridnates;
                this.dataSource.sort = this.sort;
                this.isBusy = false;
            })
            .catch((err) => {
                this.isBusy = false;
                if (isDevMode()) { console.log('+-+- ERROR FOUND WHILE GETTING inventory... ', err); }
            });
    }

    /**
     * Confirmation dialog for deleting geography
     */
    deleteDialog(row): void {
        const dialogRef = this.dialog.open(GPDeleteConfirmComponent, {
            data: { record: row }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.deleteBuildingData(result);
            }
        });
    }

    /**
     * Deleting geography details
     */
    deleteBuildingData(row) {
        if (row.levels.length > 0) {
            row.levels.forEach((floor) => {
                if (floor.id) {
                    this.commonc8yService.deleteBinary(floor.id);
                }
                if (floor.level === '0' && floor.geofences && floor.geofences.length > 0) {
                    floor.geofences.forEach(geofence => {
                        if (geofence.smartRuleConfig && geofence.smartRuleConfig.smartRuleId) {
                            (this.deleteSmartRule(geofence.smartRuleConfig.smartRuleId));
                        }
                    });
                }
            });
        }
        this.cmonSvc.deleteManagedObject(row.id).then(res => {
            // window.alert('deleted');
            this.alert.add({
                text: 'Deleted successfuly',
                type: 'success'
              } as Alert);
              this.loadFloorData();
        });
    }

    /**
     * Delete geofence smart rule based on smart rule Id
     */
    private async deleteSmartRule(smartRuleId) {
        const options: IFetchOptions = {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        };
        const response = (await (await this.fetchClient.fetch(`/service/smartrule/smartrules/${smartRuleId}`, options)));
    }

    /**
     * Open Model Dialog for editing geography information
     */
    editBuildingConfig(row): void {
        this.dialogConfig.data = {
            title: 'Geography Settings',
            draw: true,
            edit: true,
            data: row
        };
        const dialogRef = this.dialog.open(GPSmsMapDialogComponent, this.dialogConfig);

        dialogRef.afterClosed().subscribe(result => {
            if (result && result.length > 0) {
                this.alert.add({
                    text: 'Edited successfuly',
                    type: 'success'
                  } as Alert);
                this.loadFloorData();
            }
        });
      }

    /**
     * Open Model Dialog for adding geography information
     */
      openDialog(): void {
        this.dialogConfig.data = {
            title: 'Geography Settings',
            draw: true,
            edit: false
        };
        const dialogRef = this.dialog.open(GPSmsMapDialogComponent, this.dialogConfig);

        dialogRef.afterClosed().subscribe(result => {

            if (result && result.length > 0) {
                this.alert.add({
                    text: 'Added successfuly',
                    type: 'success'
                  } as Alert);
                this.loadFloorData();
            }
        });
    }
}
