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
import { NgModule } from '@angular/core';
import { Commonc8yService } from './common/c8y/commonc8y.service';
import { CoreModule, HOOK_COMPONENTS } from '@c8y/ngx-components';

import { FormsModule , ReactiveFormsModule} from '@angular/forms';
import { GPFloorPlanSettingsComponent } from './component/building-detail/sms-building-detail.component';
import { GPFloorPlanSettingsConfigComponent } from './component/config/gp-smart-map-settings.config.component';


import { MatTableModule } from '@angular/material/table';
import { MatDialogModule } from '@angular/material/dialog';

import { GPSmsMapDialogComponent } from './component/map-dialog/sms-map-dialog.component';
import { BuildingEntryPopupComponent } from './component/building-entry-popup/sms-building-entry-popup.component';
import { GPFloorDialogComponent } from './component/floor-plan/sms-floor-plan.component';
import { MarkerDetailPopupComponent } from './component/marker-detail-popup/sms-marker-detail-popup.component';
import * as preview from './common/preview';
import { GeofenceDetailPopupComponent } from './component/geofence-detail-popup/sms-geofence-detail-popup.component';
import { LocationSearchService } from './common/locationSearch.service';
import { ImageRotateService } from './common/imageRotate.service';
import { GPDeleteConfirmComponent } from './component/delete-confirm-popup/sms-delete-confirm.component';
import { TypeaheadModule } from 'ngx-bootstrap/typeahead';
import { PopoverModule } from 'ngx-bootstrap/popover';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [ BuildingEntryPopupComponent, MarkerDetailPopupComponent, GeofenceDetailPopupComponent,
    GPFloorPlanSettingsComponent, GPFloorPlanSettingsConfigComponent, GPSmsMapDialogComponent, GPFloorDialogComponent,
    GPDeleteConfirmComponent],
  imports: [
    CommonModule,
    CoreModule,
    TypeaheadModule.forRoot(),
    PopoverModule.forRoot(),
    MatTableModule,
    MatDialogModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  exports: [
    GPFloorPlanSettingsComponent, GPFloorPlanSettingsConfigComponent, GPSmsMapDialogComponent, GPDeleteConfirmComponent],
  entryComponents: [ GPFloorPlanSettingsComponent, BuildingEntryPopupComponent, MarkerDetailPopupComponent, GeofenceDetailPopupComponent,
    GPFloorPlanSettingsConfigComponent, GPSmsMapDialogComponent, GPFloorDialogComponent, GPDeleteConfirmComponent],
  providers: [
    Commonc8yService, LocationSearchService, ImageRotateService,
    {
      provide: HOOK_COMPONENTS,
      multi: true,
      useValue: {
        id: 'smart-map-settings',
        label: 'Smart map settings',
        previewImage: preview.image,
        description: 'Configuration of map',
        component: GPFloorPlanSettingsComponent,
        configComponent: GPFloorPlanSettingsConfigComponent,
        data: {
          ng1: {
            options: {
              noDeviceTarget: true,
              noNewWidgets: false,
              deviceTargetNotRequired: true,
              groupsSelectable: false
            }
          }
        }
      }
    }
  ]
})
export class GpSmartMapSettingsModule { }
