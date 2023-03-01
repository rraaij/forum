import Image from "next/image";
import iconHome from "@/public/svg/home.svg";
import iconTabler from "@/public/svg/icon-tabler.svg";
import iconTablerGrid from "@/public/svg/icon-tabler-grid.svg";
import iconTablerChevronUp from "@/public/svg/icon-tabler-chevron-up.svg";
import iconTablerMenu from "@/public/svg/icon-tabler-menu.svg";
import iconTablerSearch from "@/public/svg/icon-tabler-search.svg";
import iconTablerBell from "@/public/svg/icon-tabler-bell.svg";
import iconTablerMessages from "@/public/svg/icon-tabler-messages.svg";
import iconTablerUser from "@/public/svg/icon-tabler-user.svg";
import iconTablerHelp from "@/public/svg/icon-tabler-help.svg";
import iconTablerSettings from "@/public/svg/icon-tabler-settings.svg";
import iconTablerPaperclip from "@/public/svg/icon-tabler-paperclip.svg";
import iconTablerTrendingUp from "@/public/svg/icon-tabler-trending-up.svg";
import iconTablerPlaneDeparture from "@/public/svg/icon-tabler-plane-departure.svg";
import boxedLayout1 from "@/public/svg/boxed-layout-1.svg";
import boxedLayout2 from "@/public/svg/boxed-layout-2.svg";
import boxedLayout3 from "@/public/svg/boxed-layout-3.svg";
import boxedLayout4 from "@/public/svg/boxed-layout-4.svg";
import sidebar4 from "@/public/svg/sidebar-4.svg";
import React from "react";

export default function BoxedLayout() {
  // const [show, setShow] = useState(false);
  // const [product, setProduct] = useState(false);
  // const [deliverables, setDeliverables] = useState(false);
  // const [profile, setProfile] = useState(false);

  return (
    <>
      <div className="absolute bg-gray-200 w-full h-full">
        {/* Navigation starts */}
        {/* Mobile */}
        <div
          className={"w-full h-full absolute z-40  transform  translate-x-full"}
          //   show
          //     ? "w-full h-full absolute z-40  transform  translate-x-0 "
          //     : "   w-full h-full absolute z-40  transform -translate-x-full"
          // }
        >
          <div
            className="bg-gray-800 opacity-50 inset-0 fixed w-full h-full"
            // onClick={() => setShow(!show)}
          />
          <div className="w-64 z-20 absolute left-0 z-40 top-0 bg-white shadow flex-col justify-between transition duration-150 ease-in-out h-full">
            <div className="flex flex-col justify-between h-full">
              <div className="px-6 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Image
                      src={iconHome}
                      alt={"iconHome"}
                      height={40}
                      width={40}
                      aria-label="Home"
                    />
                    <p className="text-bold md:text2xl text-base pl-3 text-gray-800">
                      The North
                    </p>
                  </div>
                  <div
                    id="cross"
                    className=" text-gray-800"
                    // onClick={() => setShow(!show)}
                  >
                    <Image
                      className="icon icon-tabler icon-tabler-x"
                      src={iconTabler}
                      alt={"icon-tabler"}
                      width="24"
                      height="24"
                    />
                  </div>
                </div>
                <ul className="f-m-m">
                  <a>
                    <li className="text-white pt-8">
                      <div className="flex items-center">
                        <div className="md:w-6 md:h-6 w-5 h-5">
                          <Image
                            src={boxedLayout1}
                            alt={"boxedLayout1"}
                            width={16}
                            height={16}
                          />
                        </div>
                        <p className="text-indigo-500 ml-3 text-lg">
                          Dashboard
                        </p>
                      </div>
                    </li>
                  </a>
                  <a>
                    <li className="text-gray-700 pt-8">
                      <div className="flex items-center">
                        <div className="flex items-center">
                          <div className="md:w-6 md:h-6 w-5 h-5">
                            <Image
                              src={boxedLayout2}
                              alt={"boxedLayout2"}
                              width={16}
                              height={16}
                            />
                          </div>
                          <p className="text-gray-700 ml-3 text-lg">Products</p>
                        </div>
                        {/*<div onClick={() => setProduct(!product)}>*/}
                        {/*  {product ? (*/}
                        <div className="ml-4">
                          <Image
                            src={iconTablerChevronUp}
                            alt={"icon-tabler-chevron-up"}
                            className="icon icon-tabler icon-tabler-chevron-up"
                            width={14}
                            height={14}
                          />
                        </div>
                        {/*  ) : (*/}
                        {/*    <div className="ml-4">*/}
                        {/*<Image*/}
                        {/*    src={iconTablerChevronDown}*/}
                        {/*    alt={"icon-tabler-chevron-down"}*/}
                        {/*    className="icon icon-tabler icon-tabler-chevron-down"*/}
                        {/*    width={16}*/}
                        {/*    height={16}*/}
                        {/*/>*/}
                        {/*    </div>*/}
                        {/*  )}*/}
                        {/*</div>*/}
                      </div>
                      {/*{product ? (*/}
                      <div>
                        <ul className="my-3">
                          <li className="text-sm text-indigo-500 py-2 px-6">
                            Best Sellers
                          </li>
                          <li className="text-sm text-gray-800 hover:text-indigo-500 py-2 px-6">
                            Out of Stock
                          </li>
                          <li className="text-sm text-gray-800 hover:text-indigo-500 py-2 px-6">
                            New Products
                          </li>
                        </ul>
                      </div>
                      {/*) : (*/}
                      {/*  ""*/}
                      {/*)}*/}
                    </li>
                  </a>
                  <a>
                    <li className="text-gray-800 pt-8">
                      <div className="flex items-center">
                        <div className="md:w-6 md:h-6 w-5 h-5">
                          <Image
                            src={boxedLayout3}
                            alt={"boxedLayout3"}
                            width={16}
                            height={16}
                          />
                        </div>
                        <p className="text-gray-800 ml-3 text-lg">
                          Performance
                        </p>
                      </div>
                    </li>
                  </a>
                  <a>
                    <li className="text-gray-800 pt-8">
                      <div className="flex items-center">
                        <div className="flex items-center">
                          <div className="md:w-6 md:h-6 w-5 h-5">
                            <Image
                              src={boxedLayout4}
                              alt={"boxedLayout4"}
                              width={16}
                              height={16}
                            />
                          </div>
                          <p className="text-gray-800 ml-3 text-lg">
                            Deliverables
                          </p>
                        </div>
                        {/*<div onClick={() => setDeliverables(!deliverables)}>*/}
                        {/*  {deliverables ? (*/}
                        <div className=" ml-4">
                          <Image
                            src={iconTablerChevronUp}
                            alt={"icon-tabler-chevron-up"}
                            className="icon icon-tabler icon-tabler-chevron-up"
                            width={14}
                            height={14}
                          />
                        </div>
                        {/*  ) : (*/}
                        {/*    <div className="ml-4">*/}
                        {/*<Image*/}
                        {/*    src={iconTablerChevronDown}*/}
                        {/*    alt={"icon-tabler-chevron-down"}*/}
                        {/*    className="icon icon-tabler icon-tabler-chevron-down"*/}
                        {/*    width={16}*/}
                        {/*    height={16}*/}
                        {/*/>*/}
                        {/*    </div>*/}
                        {/*  )}*/}
                        {/*</div>*/}
                      </div>
                      {/*{deliverables ? (*/}
                      <div>
                        <ul className="my-3">
                          <li className="text-sm text-indigo-500 py-2 px-6">
                            Best Sellers
                          </li>
                          <li className="text-sm text-gray-800 hover:text-indigo-500 py-2 px-6">
                            Out of Stock
                          </li>
                          <li className="text-sm text-gray-800 hover:text-indigo-500 py-2 px-6">
                            New Products
                          </li>
                        </ul>
                      </div>
                      {/*) : (*/}
                      {/*  ""*/}
                      {/*)}*/}
                    </li>
                  </a>
                </ul>
              </div>
              <div className="w-full">
                <div className="flex justify-center mb-4 w-full px-6">
                  <div className="relative w-full">
                    <div className="text-gray-500 absolute ml-4 inset-0 m-auto w-4 h-4">
                      <Image
                        src={iconTablerSearch}
                        alt={"icon-tabler-search"}
                        className="icon icon-tabler icon-tabler-search"
                        width={16}
                        height={16}
                      />
                    </div>
                    <input
                      className="bg-gray-100 focus:outline-none rounded w-full text-sm text-gray-500 bg-gray-100 pl-10 py-2"
                      type="text"
                      placeholder="Search"
                    />
                  </div>
                </div>
                <div className="border-t border-gray-300">
                  <div className="w-full flex items-center justify-between px-6 pt-1">
                    <div className="flex items-center">
                      <Image
                        width={50}
                        height={50}
                        alt="profile-pic"
                        src="https://tuk-cdn.s3.amazonaws.com/assets/components/boxed_layout/bl_1.png"
                        className="w-8 h-8 rounded-md"
                      />
                      <p className=" text-gray-800 text-base leading-4 ml-2">
                        Jane Doe
                      </p>
                    </div>
                    <ul className="flex">
                      <li className="cursor-pointer text-white pt-5 pb-3">
                        <Image
                          src={iconTablerMessages}
                          alt={"icon-tabler-messages"}
                          className="icon icon-tabler icon-tabler-messages"
                          width={24}
                          height={24}
                        />
                      </li>
                      <li className="cursor-pointer text-white pt-5 pb-3 pl-3">
                        <Image
                          src={iconTablerBell}
                          alt={"icon-tabler-bell"}
                          className="icon icon-tabler icon-tabler-bell"
                          width={28}
                          height={28}
                        />
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Mobile */}
        <nav className="w-full mx-auto bg-white shadow">
          <div className="container px-6 justify-between h-16 flex items-center lg:items-stretch mx-auto">
            <div className="h-full flex items-center">
              <div className="mr-10 flex items-center">
                <Image
                  src={iconHome}
                  alt={"iconHome"}
                  height={40}
                  width={40}
                  aria-label="Home"
                />
                <h3 className="text-base text-gray-800 font-bold tracking-normal leading-tight ml-3 hidden lg:block">
                  The North
                </h3>
              </div>
              <ul className="pr-12 xl:flex items-center h-full hidden">
                <li className="cursor-pointer h-full flex items-center text-sm text-indigo-700 tracking-normal border-b-2 border-indigo-700">
                  Dashboard
                </li>
                <li className="cursor-pointer h-full flex items-center text-sm text-gry-800 mx-10 tracking-normal">
                  Products
                </li>
                <li className="cursor-pointer h-full flex items-center text-sm text-gry-800 mr-10 tracking-normal">
                  Performance
                </li>
                <li className="cursor-pointer h-full flex items-center text-sm text-gray-800 tracking-normal">
                  Deliverables
                </li>
              </ul>
            </div>
            <div className="h-full xl:flex items-center justify-end hidden">
              <div className="w-full h-full flex items-center">
                <div className="w-full pr-12 h-full flex items-center border-r">
                  <div className="relative w-full">
                    <div className="text-gray-500 absolute ml-3 inset-0 m-auto w-4 h-4">
                      <Image
                        src={iconTablerSearch}
                        alt={"icon-tabler-search"}
                        className="icon icon-tabler icon-tabler-search"
                        width={16}
                        height={16}
                      />
                    </div>
                    <input
                      className="border border-gray-100 focus:outline-none focus:border-indigo-700 w-56 rounded text-sm text-gray-500 bg-gray-100 pl-8 py-2"
                      type="text"
                      placeholder="Search"
                    />
                  </div>
                </div>
                <div className="w-full h-full flex">
                  <div className="w-32 h-full flex items-center justify-center border-r cursor-pointer text-gray-600">
                    <Image
                      src={iconTablerBell}
                      alt={"icon-tabler-bell"}
                      className="icon icon-tabler icon-tabler-bell"
                      width={28}
                      height={28}
                    />
                  </div>
                  <div
                    aria-haspopup="true"
                    className="cursor-pointer w-full flex items-center justify-end relative"
                    // onClick={() => setProfile(!profile)}
                  >
                    {/*{profile ? (*/}
                    <ul className="p-2 w-40 border-r bg-white absolute rounded z-40 left-0 shadow mt-64 ">
                      <li className="cursor-pointer text-gray-600 text-sm leading-3 tracking-normal py-2 hover:text-indigo-700 focus:text-indigo-700 focus:outline-none">
                        <div className="flex items-center">
                          <Image
                            src={iconTablerUser}
                            alt={"icon-tabler-user"}
                            className="icon icon-tabler icon-tabler-user"
                            width={20}
                            height={20}
                          />
                          <span className="ml-2">My Profile</span>
                        </div>
                      </li>
                      <li className="cursor-pointer text-gray-600 text-sm leading-3 tracking-normal mt-2 py-2 hover:text-indigo-700 focus:text-indigo-700 focus:outline-none flex items-center">
                        <Image
                          src={iconTablerHelp}
                          alt={"icon-tabler-help"}
                          className="icon icon-tabler icon-tabler-help"
                          width={20}
                          height={20}
                        />
                        <span className="ml-2">Help Center</span>
                      </li>
                      <li className="cursor-pointer text-gray-600 text-sm leading-3 tracking-normal mt-2 py-2 hover:text-indigo-700 flex items-center focus:text-indigo-700 focus:outline-none">
                        <Image
                          src={iconTablerSettings}
                          alt={"icon-tabler-settings"}
                          className="icon icon-tabler icon-tabler-settings"
                          width={20}
                          height={20}
                        />
                        <span className="ml-2">Account Settings</span>
                      </li>
                    </ul>
                    {/*) : (*/}
                    {/*  ""*/}
                    {/*)}*/}
                    <Image
                      width={50}
                      height={50}
                      className="rounded h-10 w-10 object-cover"
                      src="https://tuk-cdn.s3.amazonaws.com/assets/components/boxed_layout/bl_1.png"
                      alt="logo"
                    />
                    <p className="text-gray-800 text-sm ml-2">Jane Doe</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="visible xl:hidden flex items-center relative">
              <ul className="p-2 w-64 border-r bg-white absolute top-0 -ml-2 rounded right-0 shadow mt-12 lg:mt-16 hidden">
                <li className="cursor-pointer text-gray-600 text-sm leading-3 tracking-normal py-2 hover:text-indigo-700 focus:text-indigo-700 focus:outline-none">
                  <div className="flex items-center">
                    <Image
                      src={iconTablerUser}
                      alt={"icon-tabler-user"}
                      className="icon icon-tabler icon-tabler-user"
                      width={20}
                      height={20}
                    />
                    <span className="ml-2">Profile</span>
                  </div>
                </li>
                <li className="flex xl:hidden cursor-pointer text-gray-600 text-sm leading-3 tracking-normal mt-2 py-2 hover:text-indigo-700 focus:text-indigo-700 focus:outline-none">
                  <div className="flex items-center">
                    <Image
                      className="icon icon-tabler icon-tabler-grid"
                      src={iconTablerGrid}
                      alt={"icon-tabler-grid"}
                      width={20}
                      height={20}
                    />
                    <span className="ml-2">Dashboard</span>
                  </div>
                </li>
                <li className="flex xl:hidden  cursor-pointer text-gray-600 text-sm leading-3 tracking-normal mt-2 py-2 hover:text-indigo-700 focus:text-indigo-700 focus:outline-none flex items-center relative">
                  <Image
                    src={iconTablerHelp}
                    alt={"icon-tabler-help"}
                    className="icon icon-tabler icon-tabler-help"
                    width={20}
                    height={20}
                  />
                  <span className="ml-2">Products</span>
                </li>
                <li className="flex xl:hidden cursor-pointer text-gray-600 text-sm leading-3 tracking-normal mt-2 py-2 hover:text-indigo-700 flex items-center focus:text-indigo-700 focus:outline-none">
                  <Image
                    src={iconTablerSettings}
                    alt={"icon-tabler-settings"}
                    className="icon icon-tabler icon-tabler-settings"
                    width={20}
                    height={20}
                  />
                  <span className="ml-2">Performance</span>
                </li>
              </ul>
              <Image
                src={iconTablerMenu}
                alt={"icon-tabler-menu"}
                // onClick={() => setShow(!show)}
                className="show-m-menu icon icon-tabler icon-tabler-menu"
                width={32}
                height={32}
                aria-haspopup="true"
                aria-label="Main Menu"
              />
            </div>
          </div>
        </nav>
        {/* Navigation ends */}
        {/* Page title starts */}
        <div className="my-6 lg:my-12 container px-6 mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between pb-4 border-b border-gray-300">
          <div>
            <h4 className="text-2xl font-bold leading-tight text-gray-800">
              User Profile
            </h4>
            <ul className="flex flex-col md:flex-row items-start md:items-center text-gray-600 text-sm mt-3">
              <li className="flex items-center mr-3 mt-3 md:mt-0">
                <span className="mr-2">
                  <Image
                    src={iconTablerPaperclip}
                    alt={"icon-tabler-paperclip"}
                    className="icon icon-tabler icon-tabler-paperclip"
                    width={16}
                    height={16}
                  />
                </span>
                <span>Active</span>
              </li>
              <li className="flex items-center mr-3 mt-3 md:mt-0">
                <span className="mr-2">
                  <Image
                    src={iconTablerTrendingUp}
                    alt={"icon-tabler-trending-up"}
                    className="icon icon-tabler icon-tabler-trending-up"
                    width={16}
                    height={16}
                  />
                </span>
                <span> Trending</span>
              </li>
              <li className="flex items-center mt-3 md:mt-0">
                <span className="mr-2">
                  <Image
                    src={iconTablerPlaneDeparture}
                    alt={"icon-tabler-plane-departure"}
                    className="icon icon-tabler icon-tabler-plane-departure"
                    width={16}
                    height={16}
                  />
                </span>
                <span>Started on 29 Jan 2020</span>
              </li>
            </ul>
          </div>
          <div className="mt-6 lg:mt-0">
            <button className="mx-2 my-2 bg-white transition duration-150 ease-in-out focus:outline-none hover:bg-gray-100 rounded text-indigo-700 px-6 py-2 text-sm">
              Back
            </button>
            <button className="transition duration-150 ease-in-out hover:bg-indigo-600 focus:outline-none border bg-indigo-700 rounded text-white px-8 py-2 text-sm">
              Edit Profile
            </button>
          </div>
        </div>
        {/* Page title ends */}
        <div className="container mx-auto px-6">
          {/* Remove class [ h-64 ] when adding a card block */}
          {/* Remove class [ border-dashed border-2 border-gray-300 ] to remove dotted border */}
          <div className="w-full h-64 rounded border-dashed border-2 border-gray-300">
            {/* Place your content here */}
          </div>
        </div>
      </div>
    </>
  );
}
