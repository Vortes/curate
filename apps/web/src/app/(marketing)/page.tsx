import Link from "next/link"
import "./marketing.css"

function HeroShadows() {
	return (
		<svg
			className="hero-shadows"
			viewBox="0 0 1600 1000"
			preserveAspectRatio="xMidYMid slice"
			xmlns="http://www.w3.org/2000/svg"
		>
			<defs>
				<filter
					id="soften"
					x="-20%"
					y="-20%"
					width="140%"
					height="140%"
				>
					<feGaussianBlur
						in="SourceGraphic"
						stdDeviation="18"
					/>
				</filter>
				<filter
					id="soften-wide"
					x="-20%"
					y="-20%"
					width="140%"
					height="140%"
				>
					<feGaussianBlur
						in="SourceGraphic"
						stdDeviation="30"
					/>
				</filter>
			</defs>
			<g className="shadow-bands">
				<rect
					x="-200"
					y="-400"
					width="80"
					height="2400"
					fill="rgba(0,0,0,0.04)"
					filter="url(#soften)"
					transform="rotate(-30 800 500)"
				/>
				<rect
					x="100"
					y="-400"
					width="120"
					height="2400"
					fill="rgba(0,0,0,0.03)"
					filter="url(#soften-wide)"
					transform="rotate(-30 800 500)"
				/>
				<rect
					x="480"
					y="-400"
					width="60"
					height="2400"
					fill="rgba(0,0,0,0.035)"
					filter="url(#soften)"
					transform="rotate(-30 800 500)"
				/>
				<rect
					x="700"
					y="-400"
					width="140"
					height="2400"
					fill="rgba(0,0,0,0.025)"
					filter="url(#soften-wide)"
					transform="rotate(-30 800 500)"
				/>
				<rect
					x="1050"
					y="-400"
					width="90"
					height="2400"
					fill="rgba(0,0,0,0.04)"
					filter="url(#soften)"
					transform="rotate(-30 800 500)"
				/>
				<rect
					x="1300"
					y="-400"
					width="70"
					height="2400"
					fill="rgba(0,0,0,0.03)"
					filter="url(#soften)"
					transform="rotate(-30 800 500)"
				/>
				<rect
					x="1550"
					y="-400"
					width="110"
					height="2400"
					fill="rgba(0,0,0,0.025)"
					filter="url(#soften-wide)"
					transform="rotate(-30 800 500)"
				/>
				<rect
					x="0"
					y="-400"
					width="50"
					height="2400"
					fill="rgba(255,255,255,0.04)"
					filter="url(#soften)"
					transform="rotate(-30 800 500)"
				/>
				<rect
					x="350"
					y="-400"
					width="80"
					height="2400"
					fill="rgba(255,255,255,0.03)"
					filter="url(#soften-wide)"
					transform="rotate(-30 800 500)"
				/>
				<rect
					x="900"
					y="-400"
					width="60"
					height="2400"
					fill="rgba(255,255,255,0.035)"
					filter="url(#soften)"
					transform="rotate(-30 800 500)"
				/>
				<rect
					x="1200"
					y="-400"
					width="70"
					height="2400"
					fill="rgba(255,255,255,0.025)"
					filter="url(#soften)"
					transform="rotate(-30 800 500)"
				/>
			</g>
		</svg>
	)
}

export default function LandingPage() {
	return (
		<div className="marketing">
			<div className="content">
				<section className="hero">
					<HeroShadows />

					<nav className="nav">
						<span className="brand">curate</span>
						<ul className="nav-links">
							<li>
								<a href="#how">About</a>
							</li>
							<li>
								<a href="#how">How it works</a>
							</li>
							<li>
								<Link
									href="/sign-up"
									className="accent"
								>
									Early access
								</Link>
							</li>
						</ul>
					</nav>

					<h1 className="hero-headline">
						Everything you notice
						<br />
						becomes a reference
						<br />
						you can <em>actually use.</em>
					</h1>
					<p className="hero-sub">
						curate captures the design patterns you encounter every day and
						turns them into a personal library you can search the way you
						remember — fuzzy, imprecise, yours.
					</p>
				</section>

				<div className="divide" />

				<div
					className="label"
					id="how"
				>
					<span className="dot-accent" />
					How it works
				</div>

				<div className="inset">
					<div className="inset-number">01</div>
					<div className="inset-title">Capture what catches your eye.</div>
					<p className="inset-text">
						A keyboard shortcut. An overlay that detects individual components
						as you hover — a modal, a card, a navigation bar. Click to capture.
						It&apos;s in your library before you finish your thought.
					</p>
				</div>

				<div className="inset">
					<div className="inset-number">02</div>
					<div className="inset-title">Never organize anything.</div>
					<p className="inset-text">
						Component type, color palette, typography, platform. curate
						understands what you captured and files it without being asked. No
						folders. No tags. No maintenance.
					</p>
				</div>

				<div className="inset">
					<div className="inset-number">03</div>
					<div className="inset-title">Search like you remember.</div>
					<p className="inset-text">
						&ldquo;That date picker I saw on Linear.&rdquo; &ldquo;The way
						Stripe handles inline editing.&rdquo; Describe what you&apos;re
						looking for in your own words. curate knows what you mean.
					</p>
				</div>

				<div className="deboss-section">
					<p className="deboss-quote">
						The best design references are the ones you personally encountered,
						in context, while using real products.
					</p>
				</div>

				<div className="divide" />

				<div className="label">
					<span className="dot-accent" />
					Why this matters now
				</div>

				<div className="dark-surface">
					<div className="inset-title">
						The tools build faster now. Your eye decides what&apos;s worth
						building.
					</div>
					<p className="inset-text">
						AI can generate layouts, write code, ship prototypes before lunch.
						The bottleneck isn&apos;t execution anymore — it&apos;s taste. Every
						pattern you&apos;ve noticed, every interaction that made you pause,
						every decision you&apos;ve internalized about what good feels like.
						That&apos;s your most valuable asset. curate makes it searchable.
					</p>
				</div>

				<div className="cta-area">
					<Link
						href="/sign-up"
						className="cta-button"
					>
						Request early access
					</Link>
					<a
						href="#how"
						className="cta-secondary"
					>
						See how it works
					</a>
					<p className="cta-sub">macOS only. Free during beta.</p>
				</div>

				<footer className="foot">
					<span className="brand-foot">curate — 2026</span>
					<span>Built for designers who notice things.</span>
				</footer>
			</div>
		</div>
	)
}
