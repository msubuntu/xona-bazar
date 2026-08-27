import React from "react";
import { useSettings } from '../context/SettingsContext.jsx';
import '../components_css/footer.css'

function Footer() {
    const { t } = useSettings()
    return (
        <footer className="footer">
            <div className="footer_wave">
                <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                    <path className="wave_fill" d="M0 60L48 52C96 44 192 28 288 24C384 20 480 28 576 40C672 52 768 68 864 72C960 76 1056 68 1152 56C1248 44 1344 28 1392 20L1440 12V120H1392C1344 120 1248 120 1152 120C1056 120 960 120 864 120C768 120 672 120 576 120C480 120 384 120 288 120C192 120 96 120 48 120H0V60Z"/>
                </svg>
            </div>

            <div className="footer_body">
                <div className="footer_container">
                    <div className="footer_top">
                        <div className="footer_brand">
                            <div className="footer_logo">
                                <div className="logo_icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                                        <circle cx="9" cy="21" r="1"/>
                                        <circle cx="20" cy="21" r="1"/>
                                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                                    </svg>
                                </div>
                                <div className="logo_text">
                                    <span className="logo_xona">Xona</span>
                                    <span className="logo_bazar">Bazar</span>
                                </div>
                            </div>
                            <p className="footer_desc">
                                {t('footerDesc')}
                            </p>
                            <div className="newsletter">
                                <p className="newsletter_title">{t('newsletter')}</p>
                                <div className="newsletter_form">
                                    <input type="email" placeholder={t('newsletterPlaceholder')} />
                                    <button type="button">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                                            <line x1="22" y1="2" x2="11" y2="13"/>
                                            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="footer_links">
                            <div className="footer_col">
                                <h4>{t('company')}</h4>
                                <a href="#">{t('aboutUs')}</a>
                                <a href="#">{t('vacancies')}</a>
                                <a href="#">{t('blog')}</a>
                                <a href="#">{t('news')}</a>
                                <a href="#">{t('partnership')}</a>
                            </div>
                            <div className="footer_col">
                                <h4>{t('forCustomers')}</h4>
                                <a href="#">{t('helpCenter')}</a>
                                <a href="#">{t('craftsmen')}</a>
                                <a href="#">{t('returnPolicy')}</a>
                                <a href="#">{t('guarantee')}</a>
                                <a href="#">{t('faq')}</a>
                            </div>
                            <div className="footer_col">
                                <h4>{t('categories')}</h4>
                                <a href="#">Bo'yoqlar</a>
                                <a href="#">Plitka</a>
                                <a href="#">Asboblar</a>
                                <a href="#">Sanitariya</a>
                                <a href="#">Qurilish</a>
                            </div>
                            <div className="footer_col">
                                <h4>{t('contact')}</h4>
                                <a href="tel:+998901234567">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                                    </svg>
                                    +998 90 123 45 67
                                </a>
                                <a href="mailto:info@xonabazar.uz">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                        <polyline points="22,6 12,13 2,6"/>
                                    </svg>
                                    info@xonabazar.uz
                                </a>
                                <a href="#">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                                        <circle cx="12" cy="10" r="3"/>
                                    </svg>
                                    Toshkent, Amir Temur ko'chasi
                                </a>
                                <a href="#">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                    09:00 - 21:00
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="footer_middle">
                        <div className="footer_app">
                            <p className="app_title">{t('downloadApp')}</p>
                            <div className="app_badges">
                                <a href="#" className="app_badge">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                                    </svg>
                                    <div>
                                        <small>{t('download')}</small>
                                        <strong>App Store</strong>
                                    </div>
                                </a>
                                <a href="#" className="app_badge">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                                        <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 1.33-2.892 1.675-2.128-2.128 2.718-2.877zM5.864 3.457L16.8 9.79l-2.302 2.302L5.864 3.457z"/>
                                    </svg>
                                    <div>
                                        <small>{t('download')}</small>
                                        <strong>Google Play</strong>
                                    </div>
                                </a>
                            </div>
                        </div>

                        <div className="footer_certificates">
                            <p className="cert_title">{t('certificates')}</p>
                            <div className="cert_list">
                                <div className="cert_item">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                    </svg>
                                    <span>{t('securePayment')}</span>
                                </div>
                                <div className="cert_item">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                    <span>{t('guaranteedProduct')}</span>
                                </div>
                                <div className="cert_item">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                                        <circle cx="9" cy="7" r="4"/>
                                        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                                        <path d="M16 3.13a4 4 0 010 7.75"/>
                                    </svg>
                                    <span>{t('expertHelp')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="footer_bottom">
                        <div className="footer_social">
                            <a href="#" className="social_icon" aria-label="Facebook" title="Facebook">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                            </a>
                            <a href="#" className="social_icon" aria-label="Instagram" title="Instagram">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                                </svg>
                            </a>
                            <a href="#" className="social_icon" aria-label="Telegram" title="Telegram">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                    <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.013-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                                </svg>
                            </a>
                            <a href="#" className="social_icon" aria-label="YouTube" title="YouTube">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                </svg>
                            </a>
                            <a href="#" className="social_icon" aria-label="TikTok" title="TikTok">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                                </svg>
                            </a>
                        </div>

                        <div className="footer_payments">
                            <span className="pay_badge visa">VISA</span>
                            <span className="pay_badge mc">MasterCard</span>
                            <span className="pay_badge uzcard">UzCard</span>
                            <span className="pay_badge humo">Humo</span>
                            <span className="pay_badge payme">Payme</span>
                            <span className="pay_badge click">Click</span>
                        </div>
                    </div>

                    <div className="footer_copyright">
                        <p>&copy; 2025 Xona Bazar. {t('copyright')}</p>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer;
