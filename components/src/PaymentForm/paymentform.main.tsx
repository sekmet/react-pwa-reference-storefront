/**
 * Copyright © 2019 Elastic Path Software Inc. All rights reserved.
 *
 * This is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this license. If not, see
 *
 *     https://www.gnu.org/licenses/
 *
 *
 */

import React, { Component } from 'react';
import { login } from '../utils/AuthService';
import { cortexFetch } from '../utils/Cortex';
import './paymentform.main.less';
import { getConfig, IEpConfig } from '../utils/ConfigProvider';

let Config: IEpConfig | any = {};
let intl = { get: str => str };

const today = new Date();

interface PaymentFormMainProps {
  /** paymentinstrumentform to post to.  Can either be from the profile or the order resource. */
  paymentInstrumentFormUri: string,
  /** handle close modal */
  onCloseModal?: (...args: any[]) => any,
  /** handle fetch data */
  fetchData?: (...args: any[]) => any,
}

interface PaymentFormMainState {
    showLoader: boolean,
    cardType: string,
    cardHolderName: string,
    cardNumber: string,
    expiryMonth: number,
    expiryYear: number,
    securityCode: string,
    saveToProfile: boolean,
    failedSubmit: boolean,
    paymentInstrumentFormFieldsToFill: object;
    submitPaymentFormUri: string;
}

class PaymentFormMain extends Component<PaymentFormMainProps, PaymentFormMainState> {
  static defaultProps = {
    onCloseModal: () => {},
    fetchData: () => {},
  }

  formRef: React.RefObject<HTMLFormElement>;

  constructor(props) {
    super(props);
    const epConfig = getConfig();
    Config = epConfig.config;
    ({ intl } = getConfig());
    this.state = {
      showLoader: false,
      cardType: '003',
      cardHolderName: '',
      cardNumber: '',
      expiryMonth: today.getMonth() + 1,
      expiryYear: today.getFullYear(),
      securityCode: '',
      saveToProfile: false,
      failedSubmit: false,
      paymentInstrumentFormFieldsToFill: {},
      submitPaymentFormUri: '',
    };

    this.setCardType = this.setCardType.bind(this);
    this.setCardHolderName = this.setCardHolderName.bind(this);
    this.setCardNumber = this.setCardNumber.bind(this);
    this.setExpiryMonth = this.setExpiryMonth.bind(this);
    this.setExpiryYear = this.setExpiryYear.bind(this);
    this.setSecurityCode = this.setSecurityCode.bind(this);
    this.setSaveToProfile = this.setSaveToProfile.bind(this);
    this.submitPayment = this.submitPayment.bind(this);
    this.fetchPaymentInstrumentForm = this.fetchPaymentInstrumentForm.bind(this);
    this.setPaymentInstrumentFormFieldsToFill = this.setPaymentInstrumentFormFieldsToFill.bind(this);
    this.fillPaymentInstrumentFormFields = this.fillPaymentInstrumentFormFields.bind(this);
    this.setSubmitPaymentFormUri = this.setSubmitPaymentFormUri.bind(this);
    this.initializeState = this.initializeState.bind(this);
    this.cancel = this.cancel.bind(this);
    this.formRef = React.createRef<HTMLFormElement>();
  }

  async initializeState() {
    const paymentInstrumentForm = await this.fetchPaymentInstrumentForm();
    this.setPaymentInstrumentFormFieldsToFill(paymentInstrumentForm);
    this.setSubmitPaymentFormUri(paymentInstrumentForm);
  }

  async componentDidMount() {
    this.initializeState();
  }

  setSubmitPaymentFormUri(paymentInstrumentForm) {
    const submitPaymentFormUri = PaymentFormMain.parsePaymentInstrumentFormActionFromResponse(paymentInstrumentForm);
    this.setState({ submitPaymentFormUri });
  }

  setPaymentInstrumentFormFieldsToFill(paymentInstrumentForm) {
    const paymentFormFieldsToFill = PaymentFormMain.parsePaymentInstrumentFormFieldsFromResponse(paymentInstrumentForm);
    this.setState({ paymentInstrumentFormFieldsToFill: paymentFormFieldsToFill });
  }

  static parsePaymentInstrumentFormActionFromResponse(paymentInstrumentForm) {
    return paymentInstrumentForm._paymentinstrumentform[0].self.uri;
  }

  componentDidUpdate(prevProps, prevState) {
    const { paymentInstrumentFormUri } = this.props;

    if (paymentInstrumentFormUri !== prevProps.paymentInstrumentFormUri) {
      this.initializeState();
    }
  }

  async fetchPaymentInstrumentForm() {
    const { paymentInstrumentFormUri } = this.props;
    let paymentInstrumentFormUnserialized;

    try {
      await login();

      const paymentInstrumentForm = await cortexFetch(
        `${paymentInstrumentFormUri}?zoom=paymentinstrumentform`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem(`${Config.cortexApi.scope}_oAuthToken`),
          },
        },
      );

      paymentInstrumentFormUnserialized = await paymentInstrumentForm.json();

      return paymentInstrumentFormUnserialized;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Unable to fetch PaymentInstrumentForm ', err);
    }

    return paymentInstrumentFormUnserialized;
  }

  static parsePaymentInstrumentFormFieldsFromResponse(paymentInstrumentForm) {
    const zoomResult = paymentInstrumentForm._paymentinstrumentform[0];

    const paymentInstrumentFormKeys = Object.keys(zoomResult).filter((key) => {
      if (key === 'self' || key === 'links' || key === 'messages') {
        return false;
      }
      return true;
    });

    return paymentInstrumentFormKeys.reduce((acc, cKey) => {

      return {
        ...acc,
        [cKey]: zoomResult[cKey],
      };
    }, {});
  }

  setCardType(event) {
    this.setState({ cardType: event.target.value });
  }

  setCardHolderName(event) {
    this.setState({ cardHolderName: event.target.value });
  }

  setCardNumber(event) {
    this.setState({ cardNumber: event.target.value });
  }

  setExpiryMonth(event) {
    this.setState({ expiryMonth: event.target.value });
  }

  setExpiryYear(event) {
    this.setState({ expiryYear: event.target.value });
  }

  setSecurityCode(event) {
    this.setState({ securityCode: event.target.value });
  }

  setSaveToProfile(event) {
    this.setState({ saveToProfile: event.target.checked });
  }

  areCreditCardFieldsValid() {
    const {
      cardHolderName, cardNumber, securityCode,
    } = this.state;
    const holderName = cardHolderName.split(' ');

    if (!cardHolderName || !cardNumber || !securityCode || !(holderName[0] && holderName[1])) {
      return true;
    }

    return false;
  }

  static generateToken() {
    /*
    Function that will tokenize credit card information.  
    Function returns random string as implementor will replace this function and have their own way of tokenizing.
    */
    return Math.random().toString(36).substr(2, 9);
  }

  // TODO:  We should either mock up the requests before hand or ensure that the component can work within storybook...
  async submitPayment(event) {
    const {
      paymentInstrumentFormFieldsToFill,
      submitPaymentFormUri,
    } = this.state;

    const {
      fetchData,
      onCloseModal,
    } = this.props;

    event.preventDefault();

    if (this.areCreditCardFieldsValid()) {
      this.setState({ showLoader: true, failedSubmit: false });
    } else {
      this.setState({ failedSubmit: true });
    }    

    const formFieldsFilled = this.fillPaymentInstrumentFormFields(paymentInstrumentFormFieldsToFill);

    try {
      const addPaymentResponse = await cortexFetch(submitPaymentFormUri,
        {
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem(`${Config.cortexApi.scope}_oAuthToken`),
          },
          body: JSON.stringify(formFieldsFilled),
        });

      this.setState({
        showLoader: false,
      });

      if (addPaymentResponse.status === 400) {
        this.setState({ failedSubmit: true });
      } else if (addPaymentResponse.status === 201 || addPaymentResponse.status === 200 || addPaymentResponse.status === 204) {
        this.setState({ failedSubmit: false }, () => {
          fetchData();
          onCloseModal();
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  fillPaymentInstrumentFormFields(paymentInstrumentFormFieldsToFill) {
    const keys = Object.keys(paymentInstrumentFormFieldsToFill);
    const formFieldsToFill = paymentInstrumentFormFieldsToFill;

    for (let i = 0; i < keys.length; i++) {
      const cKey = keys[i];

      if (paymentInstrumentFormFieldsToFill[cKey] === '') {
        formFieldsToFill[cKey] = PaymentFormMain.generateToken();
      } else {
        formFieldsToFill[cKey] = this.fillPaymentInstrumentFormFields(formFieldsToFill[cKey]);
      }
    }

    return paymentInstrumentFormFieldsToFill;
  }

  cancel() {
    const { onCloseModal } = this.props;
    onCloseModal();
  }

  static renderYears() {
    const options = [];
    for (let i = 0; i < 10; i += 1) {
      options.push(
        <option key={today.getFullYear() + i} value={today.getFullYear() + i}>
          {today.getFullYear() + i}
        </option>,
      );
    }
    return options;
  }

  render() {
    const {
      cardType, cardHolderName, cardNumber, expiryMonth, expiryYear, securityCode, saveToProfile, failedSubmit, showLoader,
    } = this.state;
    
    return (
      <div className="payment-method-container container">
        <div className="feedback-label feedback-container" data-region="componentPaymentFeedbackRegion">
          {failedSubmit ? intl.get('failed-to-save-message') : ''}
        </div>
        <form className="form-horizontal" onSubmit={this.submitPayment}>
          {showLoader && (
            <div className="loader-wrapper">
              <div className="miniLoader" />
            </div>
          )}
          <div className="form-group">
            <span className="gray-txt">
              {intl.get('all-fields-required')}
            </span>
          </div>
          <div className="form-group">
            <label htmlFor="CardHolderName" data-el-label="payment.cardHolderName" className="control-label form-label">
              {intl.get('card-holders-name')}
            </label>
            <div className="form-input">
              {/* eslint-disable-next-line max-len */}
              <input id="CardHolderName" name="CardHolderName" className="form-control" type="text" value={cardHolderName} onChange={this.setCardHolderName} />
            </div>
          </div>
          <div className="form-group card-type-group">
            <label htmlFor="CardType" data-el-label="payment.cardType" className="control-label form-label">
              {intl.get('card-type')}
            </label>
            <div className="form-input">
              <select id="CardType" name="CardType" className="form-control" value={cardType} onChange={this.setCardType}>
                <option value="003">
                  {intl.get('american-express')}
                </option>
                <option value="002">
                  {intl.get('mastercard')}
                </option>
                <option value="001">
                  {intl.get('visa')}
                </option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="CardNumber" data-el-label="payment.cardNum" className="control-label form-label">
              {intl.get('credit-card-number')}
            </label>
            <div className="form-input">
              <input id="CardNumber" name="CardNumber" className="form-control" type="text" pattern="\d*" value={cardNumber} onChange={this.setCardNumber} />
            </div>
          </div>
          <div className="form-group expiry-date-group">
            <label htmlFor="ExpiryMonth" data-el-label="payment.expiryDate" className="control-label form-label">
              {intl.get('expiry-date')}
            </label>
            <div className="form-input form-inline">
              <select id="ExpiryMonth" name="ExpiryMonth" className="form-control expiry-date" value={expiryMonth} onChange={this.setExpiryMonth}>
                <option value="1">
                  1
                </option>
                <option value="2">
                  2
                </option>
                <option value="3">
                  3
                </option>
                <option value="4">
                  4
                </option>
                <option value="5">
                  5
                </option>
                <option value="6">
                  6
                </option>
                <option value="7">
                  7
                </option>
                <option value="8">
                  8
                </option>
                <option value="9">
                  9
                </option>
                <option value="10">
                  10
                </option>
                <option value="11">
                  11
                </option>
                <option value="12">
                  12
                </option>
              </select>
              &nbsp;/&nbsp;
              <select id="ExpiryYear" name="ExpiryYear" className="form-control expiry-date" value={expiryYear} onChange={this.setExpiryYear}>
                {PaymentFormMain.renderYears()}
              </select>
            </div>
          </div>
          <div className="form-group security-code-group">
            <label htmlFor="SecurityCode" data-el-label="payment.securityCode" className="control-label form-label">
              {intl.get('security-code')}
            </label>
            <div className="form-input">
              {/* eslint-disable-next-line max-len */}
              <input id="SecurityCode" name="SecurityCode" className="form-control" maxLength={4} type="text" pattern="\d*" value={securityCode} onChange={this.setSecurityCode} />
            </div>
          </div>
          <div className="form-group save-to-profile-group" data-el-label="payment.saveToProfileFormGroup">
            <div className="form-input">
              {/* eslint-disable-next-line max-len */}
              <input type="checkbox" id="saveToProfile" data-el-label="payment.saveToProfile" className="style-checkbox" checked={saveToProfile} onChange={this.setSaveToProfile} />
              <label htmlFor="saveToProfile" />
            </div>
            <label htmlFor="saveToProfile" className="control-label form-label">
              {intl.get('save-payment-to-profile')}
            </label>
          </div>
          <div className="form-group form-btn-group">
            <div className="control-label" />
            <div className="form-input btn-container">
              <button className="ep-btn payment-cancel-btn" data-el-label="paymentForm.cancel" type="button" onClick={() => { this.cancel(); }}>
                {intl.get('cancel')}
              </button>
              <button className="ep-btn primary payment-save-btn" data-el-label="paymentForm.save" type="submit">
                {intl.get('save')}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }
}

export default PaymentFormMain;
