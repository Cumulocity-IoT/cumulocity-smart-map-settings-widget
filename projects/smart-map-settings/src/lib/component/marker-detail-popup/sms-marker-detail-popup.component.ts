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

import { Component, OnInit, Injectable, Output, EventEmitter, Input } from '@angular/core';
import { Commonc8yService } from '../../common/c8y/commonc8y.service';
import { FormControl, FormBuilder, Validators } from '@angular/forms';
import {Observable, of} from 'rxjs';
import {debounceTime, distinctUntilChanged, map, filter, tap, switchMap, catchError, skip} from 'rxjs/operators';

@Component({
  selector: 'lib-sms-marker-detail-popup',
  templateUrl: './sms-marker-detail-popup.component.html',
  styleUrls: ['./sms-marker-detail-popup.component.less']
})
export class MarkerDetailPopupComponent implements OnInit {
  _latLongsLayer: any;

  @Input()
  set latLongsLayer(latLongs: any) {
    this._latLongsLayer =  latLongs;
  }
  @Input() uniqueId: any;
  @Output() dataSaved: EventEmitter<any>;
  @Output() dataEdited: EventEmitter<any>;
  deviceForm = this.formBuilder.group({
    device: [null, Validators.required]
  });
  editData: any;
  model: any;
  devices = { data: [], paging: null };
  searching = false;
  searchFailed = false;
  deviceSearchResults = [];

  constructor(
    private cmonSvc: Commonc8yService,
    private formBuilder: FormBuilder
  ) {
    this.dataSaved = new EventEmitter<any>();
    this.dataEdited = new EventEmitter<any>();
   }

   /**
    * Search device name based on given text in typeahead
    */
  search = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => this.searching = true),
      switchMap(term =>
        this.cmonSvc.getAllDevices(1, term)
      ),
      tap(() => this.searching = false)
    )

  ngOnInit() {
    this.deviceSearch();
  }

  resultFormatDeviceListValue(value: any) {
    return value.name;
  }

  inputFormatDeviceListValue(value: any)   {
    if (value.name) {
      return value.name;
    }
    return value;
  }

  /**
   * Search devices on load.
   */
  deviceSearch() {
    this.deviceForm
      .valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        tap(() => this.searching = true),
        switchMap(value =>
          this.cmonSvc.getAllDevices(1, value.device)
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
   * Save and emit selected device
   */
  deviceSelected(device) {
    if (device) {
      this.dataSaved.emit({
        uniqueId: this.uniqueId, id: device.id,
        c8y_Position: { lat: this._latLongsLayer._latlng.lat, lng: this._latLongsLayer._latlng.lng }
      });
      return device.name;
    }
  }
}
