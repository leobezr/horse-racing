import { NUMBER_FORMAT } from "../../config/number";

export const NumberNormalizer = (flatingNumber: number) => {
  return new Intl.NumberFormat(NUMBER_FORMAT).format(flatingNumber);
};
