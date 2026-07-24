import { Country, State, City } from 'country-state-city';
import { ApiResponse } from '../../utils/ApiResponse.js';

/**
 * GET /api/geo/countries
 * Returns list of all countries sorted by name
 */
export const getCountries = async (req, res, next) => {
  try {
    const countries = Country.getAllCountries().map((c) => ({
      code: c.isoCode,
      name: c.name,
      phone_code: c.phonecode ? `+${c.phonecode.replace(/^\+/, '')}` : '',
      flag: c.flag || '',
    }));

    return res
      .status(200)
      .json(new ApiResponse(200, countries, 'Countries retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/geo/states?country=
 * Returns list of states for a given country code or name
 */
export const getStates = async (req, res, next) => {
  try {
    const { country } = req.query;
    if (!country) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, 'Country parameter is required'));
    }

    const countryInput = String(country).trim();
    // Resolve country isoCode if name was passed
    let countryCode = countryInput.toUpperCase();
    if (countryCode.length !== 2) {
      const found = Country.getAllCountries().find(
        (c) => c.name.toLowerCase() === countryInput.toLowerCase()
      );
      if (found) countryCode = found.isoCode;
    }

    const states = State.getStatesOfCountry(countryCode).map((s) => ({
      code: s.isoCode,
      name: s.name,
      country_code: s.countryCode,
    }));

    return res
      .status(200)
      .json(new ApiResponse(200, states, 'States retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/geo/cities?country=&state=
 * Returns list of cities for a given country and state
 */
export const getCities = async (req, res, next) => {
  try {
    const { country, state } = req.query;
    if (!country || !state) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, 'Both country and state parameters are required'));
    }

    const countryInput = String(country).trim();
    const stateInput = String(state).trim();

    // Resolve country code
    let countryCode = countryInput.toUpperCase();
    if (countryCode.length !== 2) {
      const foundCountry = Country.getAllCountries().find(
        (c) => c.name.toLowerCase() === countryInput.toLowerCase()
      );
      if (foundCountry) countryCode = foundCountry.isoCode;
    }

    // Resolve state code
    let stateCode = stateInput.toUpperCase();
    const allCountryStates = State.getStatesOfCountry(countryCode);
    const foundState = allCountryStates.find(
      (s) =>
        s.isoCode.toUpperCase() === stateCode ||
        s.name.toLowerCase() === stateInput.toLowerCase()
    );

    if (foundState) {
      stateCode = foundState.isoCode;
    }

    const cities = City.getCitiesOfState(countryCode, stateCode).map((c) => ({
      name: c.name,
    }));

    return res
      .status(200)
      .json(new ApiResponse(200, cities, 'Cities retrieved successfully'));
  } catch (error) {
    next(error);
  }
};
