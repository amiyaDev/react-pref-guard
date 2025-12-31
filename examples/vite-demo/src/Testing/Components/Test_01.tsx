import { withPerfGuard } from "react-pref-guard";
import { burnCPU } from "../Utils/prefUtils";
import { TestWrapper } from "./TestWrapper";

function SlowComp() {
  burnCPU(18);
  return <div>Slow Render (70%)</div>;
}

export const Test01 = withPerfGuard(() => (
  <TestWrapper id="test_01">
    <SlowComp />
  </TestWrapper>
));
