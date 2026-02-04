# Manuscript Summary: A new comparison principle for discrete Volterra equations with an application to convex sweeping processes

**Authors:** Thierno Mamadou Baldé, Vuk Milisic, Steffen Plunder

## Overview

This manuscript introduces a new **comparison principle** for Volterra integral equations that does not rely on spectral decomposition or Laplace transform techniques. This allows for obtaining **uniform $L^\infty$ bounds** for discrete approximations, which is critical when the kernel does not have a "nice" resolvent (e.g., non-exponentially decaying kernels) or when working with time-stepping schemes where uniformity in the step size $h$ is required.

The theoretical results are applied to a **Delayed Sweeping Process**, a mathematical model motivated by cell biology (cells adhering to past positions). The authors establish existence and convergence results for this system.

## Key Contributions

### 1. Comparison Principle (Continuous & Discrete)
*   **Problem:** Standard spectral limits fail for discrete approximations or non-standard kernels.
*   **Solution:** A resolvent-free comparison principle is derived.
*   **Key Innovation:** Construction of an **Initial Layer Corrector** ($w$) that compensates for the kernel's long-time tail. This corrector allows the construction of a super-solution that bounds the actual solution.
*   **Result:** 
    *   **Continuous:** $z \in L^\infty(0,T)$ for non-increasing integrable kernels.
    *   **Discrete:** The discrete solution $(Z^n)$ is bounded **uniformly** with respect to the time step $h$.

### 2. Delayed Sweeping Process
*   **Model:** A moving particle constrained to a time-dependent convex set $C(t)$, where the "force" driving the particle depends on a weighted average of its **past positions** (memory).
    *   Equation: $X(t) = P_{C(t)} \left( \int_0^\infty \varrho(s) X(t-s) ds \right)$
*   **Discrete Formulation:** 
    *   $X^n = P_{C^n}(\overline{X}^n)$ where $\overline{X}^n$ is the discrete weighted average of past positions.
    *   Reformulated as a minimization problem: $X^n = \argmin_{W \in C^n} \mathcal{E}_n(W)$.

### 3. Energy Estimates & Convergence
*   **Energy Dissipation:** A discrete energy inequality is proven:
    $$ \mathcal{E}_N(X^N) + \sum_{n=0}^{N-1} D_n \leq e^{2T} \mathcal{E}_0 + \text{forcing terms} $$
    where $D_n$ is a non-negative dissipation term related to the kernel monotonicity.
*   **Compactness:** The energy estimates provide uniform bounds (crucially relying on the new comparison principle), which allow for compactness arguments (Arzelà-Ascoli).
*   **General Convergence:** Proves that the discrete process converges to the continuous Delayed Sweeping Process as $h \to 0$.
*   **Circular Sets:** A specific, detailed proof of uniform $H^1$ bounds is provided for the case of **moving circular constraints**, ensuring convergence in that specific geometry.

## Mathematical Notations & Assumptions

*   **Kernel $\varrho$:** Non-negative, unit mass, non-increasing, finite first/second moments.
*   **Condition:** $-\varrho'(a)/\varrho(a) \leq \zeta$ (allows polynomial decay, excludes some pathological cases).
*   **Discrete Operator:**
    *   $R_j = \frac{1}{h} \int_{jh}^{(j+1)h} \varrho(a) da$ (Cell averages).
    *   $\overline{X}^n = \frac{h \sum X^{n-j} R_j}{1 - h R_0}$.

## Appendices
*   **Moments:** Error estimates for discrete moment approximations (order $h$).
*   **Discrete Convolution:** Proof of $L^p$ convergence of discrete causal convolutions to their continuous counterparts.
*   **Decay:** Technical results on kernel decay rates in weighted $L^1$ spaces.
