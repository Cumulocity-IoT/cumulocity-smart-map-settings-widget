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

import { Component, EventEmitter } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

export interface ConfrimData {
    isConfirm?: false;
    record?: any;
}

@Component({
    // tslint:disable-next-line: component-selector
    selector: 'sms-delete-confirm',
    templateUrl: 'sms-delete-confirm.component.html',
})
export class GPDeleteConfirmComponent {
    input: any;
    public event: EventEmitter<any> = new EventEmitter();
    constructor(
        public bsModalRef: BsModalRef) { }

    deleteAction() {
        this.event.emit({isConfirm: true});
        this.bsModalRef.hide();
    }
    dismiss() {
        this.event.emit(false);
        this.bsModalRef.hide();
    }

}
