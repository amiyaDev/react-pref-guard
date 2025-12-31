import { withPerfGuard } from "react-pref-guard";
import { burnCPU } from "../Utils/prefUtils";
import { TestWrapper } from "./TestWrapper";

function VerySlowComp() {
  burnCPU(30);
  return <div>Very Slow Render</div>;
}

export const Test02 = withPerfGuard(() => (
  <TestWrapper id="test_02">
    <VerySlowComp />
  </TestWrapper>
));
