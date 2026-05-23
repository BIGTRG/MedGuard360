/**
 * External integration adapters — vendor-abstracted, stub-by-default.
 *
 * Pattern: each adapter exposes a typed interface, a stub implementation
 * suitable for dev/demo, and a factory `get<X>Adapter()` that selects the
 * implementation from env. Real implementations (SOAP, REST, EDI/SFTP) are
 * filled in when the vendor relationship is signed.
 *
 * See integrations/<vendor>/README.md + spec.md for protocol details.
 */

export * from './nctracks';
export * from './mtm';
export * from './modivcare';
export * from './cgs';
export * from './davinci-pas';
