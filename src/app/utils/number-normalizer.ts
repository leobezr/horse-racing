import { NUMBER_FORMAT } from "../../config/number";

export const NumberNormalizer = (floatingNumber: number) => {
  return new Intl.NumberFormat(NUMBER_FORMAT).format(floatingNumber);
};
